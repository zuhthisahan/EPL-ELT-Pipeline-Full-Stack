import pyspark
from delta import *
from pyspark.sql import SparkSession
import os
import glob
from delta import configure_spark_with_delta_pip
from pyspark.sql.functions import col, explode, to_timestamp, lit


def init_spark_session():
    # NO Windows paths here anymore! Docker knows where Python is.
    builder = SparkSession.builder \
        .appName("FootballLakehouse") \
        .master("local[*]") \
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")

    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")
    print("Spark Session Started.")
    return spark

def process_league_standings(spark):
    # Read Bronze layer
    bronze_path = '/opt/airflow/data_lake/bronze/league/'
    print(f"Reading from: {bronze_path}")
    # Load the JSON
    df_raw = spark.read.option('multiline', 'true').json(bronze_path)


    # Transform and flatten the data (Silver Schema)
    df_exploded = df_raw.select(
        explode(col('data')).alias('team_record'),
        col('_metadata.extraction_timestamp').alias('extraction_timestamp'),
        col('load_date')
    )

    # Create the strictly typed database columns
    df_silver = df_exploded.select(
        col('team_record.Team').alias('team_name'),
        col('team_record.url').alias('team_url'),
        
        # Table data
        col('team_record.Data')[0].cast('int').alias('rank'),
        col("team_record.Data")[3].cast("int").alias("matches_played"),
        col("team_record.Data")[4].cast("int").alias("wins"),
        col("team_record.Data")[5].cast("int").alias("draws"),
        col("team_record.Data")[6].cast("int").alias("losses"),
        col("team_record.Data")[7].cast("int").alias("goals_for"),
        col("team_record.Data")[8].cast("int").alias("goals_against"),
        col("team_record.Data")[9].cast("int").alias("points"),
        col("team_record.Data")[10].cast("int").alias("xG_for"),
        col("team_record.Data")[11].cast("int").alias("xG_against"),
        
        to_timestamp(col('extraction_timestamp'), 'yyyy-MM-dd HH:mm:ss').alias('updated_at'),
        col("load_date")
    )

    print("Data cleaned and flattened. Example:")
    df_silver.show(5)


    # Write to Silver layer
    silver_path = '/opt/airflow/data_lake/silver/league_standings'

    # Check if the delta table already exists
    if DeltaTable.isDeltaTable(spark, silver_path):
        print('updating the existing delta table (MERGE)...')
        delta_table = DeltaTable.forPath(spark, silver_path)
        
        # Upsert logic: match on team_name and update all columns if there's a match, otherwise insert
        delta_table.alias('target').merge(
            df_silver.alias('source'),
            'target.team_name = source.team_name'
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
        print('Silver Layer Updated!')
        
    else:
        df_silver.write.format('delta').mode('overwrite').save(silver_path)
        print('New Silver Layer Created!')
        
def process_team_matches_and_stats(spark):

    # Find the latest load_date folder in the bronze layer
    team_folders = sorted(glob.glob("/opt/airflow/data_lake/bronze/teams/load_date=*/"))
    latest_folder = team_folders[-1]
    load_date_val = latest_folder.split("load_date=")[-1].rstrip("/\\")

    # Read all JSON files
    df_raw = spark.read.option("multiline", "true").json(f"{latest_folder}/*.json")

    # Part1 : Transform and flatten the data for matches_date
    df_exploded = df_raw.select(
        col("team_name"),
        explode(col("results")).alias("match"),
        col("_metadata.extraction_timestamp").alias("extraction_timestamp")
    )

    # Create the strictly typed database columns for matches
    df_silver_matches = df_exploded.select(
        col("team_name"),
        col("match.date").alias("match_date"),
        col("match.opponent").alias("opponent"),
        col("match.side").alias("home_away"),
        col("match.result").alias("result_status"),
        col("match.team_score").cast("int").alias("goals_scored"),
        col("match.opponent_score").cast("int").alias("goals_conceded"),
        col("match.team_xg").cast("float").alias("xg_for"),
        col("match.opponent_xg").cast("float").alias("xg_against"),
        to_timestamp(col("extraction_timestamp"), "yyyy-MM-dd HH:mm:ss").alias("updated_at"),
        lit(load_date_val).alias("load_date")
    )
    print("\n--- SILVER TEAM MATCHES PREVIEW ---")
    df_silver_matches.show(5,0)

    # Write to Delta (UPSERT)
    silver_matches_path = "/opt/airflow/data_lake/silver/team_matches"
    if DeltaTable.isDeltaTable(spark, silver_matches_path):
        print("\n Existing Delta Table found. Performing UPSERT...")
        delta_table = DeltaTable.forPath(spark, silver_matches_path)
        
        # UPSERT LOGIC
        delta_table.alias('target').merge(
            df_silver_matches.alias('source'),
        """target.team_name = source.team_name
        AND target.match_date = source.match_date
        AND target.opponent = source.opponent
        """
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
        print("Silver 'team_matches' Updated!")

    else:
        df_silver_matches.write.format('delta').mode('overwrite').save(silver_matches_path)
        print("New Silver 'team_matches' Created!")

    # Part2 : Transform and flatten team stats
    print("\n Processing Team Statistics...")

    # Explode the statistics array
    df_stats_exploded = df_raw.select(
        col("team_name"),
        explode(col("statistics")).alias("stat"),
        col("_metadata.extraction_timestamp").alias("extraction_timestamp")
    )

    # Create the strictly typed database columns
    # The col("stat.*") is a PySpark trick that automatically flattens 
    # every key-value pair inside the statistics dictionary into separate columns!
    df_silver_stats = df_stats_exploded.select(
        col("team_name"),
        col("stat.*"), 
        to_timestamp(col("extraction_timestamp"), "yyyy-MM-dd HH:mm:ss").alias("updated_at"),
        lit(load_date_val).alias("load_date")
    )

    print("\n--- SILVER TEAM STATISTICS PREVIEW ---")
    df_silver_stats.show(5, False)
    silver_stats_path = "/opt/airflow/data_lake/silver/team_statistics"

    if DeltaTable.isDeltaTable(spark, silver_stats_path):
        print("\n Existing Delta Table found for stats. Performing UPSERT...")
        delta_table_stats = DeltaTable.forPath(spark, silver_stats_path)
        
        # UPSERT LOGIC
        delta_table_stats.alias('target').merge(
            df_silver_stats.alias('source'),
            """target.team_name = source.team_name
            AND target.load_date = source.load_date
            AND target.Situation = source.Situation
            """
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
        print("Silver 'team_statistics' Updated!")

    else:
        df_silver_stats.write.format('delta').mode('overwrite').save(silver_stats_path)
        print("New Silver 'team_statistics' Created!")
    
    # Part 3: Process team fixtures
    print("\n Processing Upcoming Fixtures...")

    # Explode the 'fixtures' array from your raw JSON
    df_fixtures_exploded = df_raw.select(
        col("team_name"),
        explode(col("fixtures")).alias("fixture"),
        col("_metadata.extraction_timestamp").alias("extraction_timestamp"),
        lit(load_date_val).alias("load_date")
    )

    # Structure the Silver Fixtures Table
    df_silver_fixtures = df_fixtures_exploded.select(
        col("team_name"),
        col("fixture.date").alias("fixture_date"),
        col("fixture.time").alias("fixture_time"),
        col("fixture.opponent").alias("opponent"),
        col("fixture.side").alias("home_away"),
        to_timestamp(col("extraction_timestamp"), "yyyy-MM-dd HH:mm:ss").alias("updated_at"),
        col("load_date")
    )
    # Deduplicate just in case
    df_silver_fixtures = df_silver_fixtures.dropDuplicates(["team_name", "fixture_date", "opponent"])

    # Save to Silver Layer using Overwrite (Since future fixtures constantly shift dates/times, 
    # Overwriting the upcoming schedule is safer than trying to merge it).
    fixtures_path = "/opt/airflow/data_lake/silver/team_fixtures"
    df_silver_fixtures.write.format("delta").mode("overwrite").save(fixtures_path)
    print("Silver 'team_fixtures' Created!")  

def process_players(spark):
    
    # Read all Player files
    # Find the latest load_date folder
    player_folders = sorted(glob.glob("/opt/airflow/data_lake/bronze/players/load_date=*/"))
    if not player_folders:
        print("No bronze player data found.")
        exit()

    latest_folder = player_folders[-1]
    load_date_val = latest_folder.split("load_date=")[-1].rstrip("/\\")

    # Grab ALL json files
    df_raw = spark.read.option("multiline", "true").json(f"{latest_folder}/*.json")
    print("Successfully loaded all player JSONs into Spark!")

    # A. TRANSFORM & FLATTEN: PLAYER SEASONS
    print("\n Processing Player Seasons...")

    df_seasons_exploded = df_raw.select(
        col("player_name"),
        col("player_url"),
        explode(col("seasonal_performance")).alias("season"),
        col("_metadata.extraction_timestamp").alias("extraction_timestamp")
    )

    # Filter out the "Total/Summary" row Understat provides at the bottom (where Season is empty)
    df_silver_seasons = df_seasons_exploded.filter(col("season.Season") != "").select(
        col("player_name"),
        col("player_url"),
        col("season.Season").alias("season_year"),
        col("season.Team").alias("team_name"),
        
        # Cast strings to numeric values. Empty strings "" automatically become NULL safely.
        col("season.Apps").cast("int").alias("appearances"),
        col("season.Min").cast("int").alias("minutes_played"),
        col("season.G").cast("int").alias("goals"),
        col("season.A").cast("int").alias("assists"),
        col("season.Sh90").cast("float").alias("shots_per_90"),
        col("season.KP90").cast("float").alias("key_passes_per_90"),
        col("season.xG").cast("float").alias("xg"),
        col("season.xA").cast("float").alias("xa"),
        
        to_timestamp(col("extraction_timestamp"), "yyyy-MM-dd HH:mm:ss").alias("updated_at"),
        lit(load_date_val).alias("load_date")
    )

    print("\n--- SILVER PLAYER SEASONS PREVIEW ---")
    df_silver_seasons.show(5)
    
    # Write to Delta (UPSERT)
    silver_seasons_path = "/opt/airflow/data_lake/silver/player_seasons"

    if DeltaTable.isDeltaTable(spark, silver_seasons_path):
        delta_table_seasons = DeltaTable.forPath(spark, silver_seasons_path)
        delta_table_seasons.alias('target').merge(
            df_silver_seasons.alias('source'),
            """target.player_name = source.player_name
            AND target.season_year = source.season_year
            AND target.team_name = source.team_name"""
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
        print("Silver 'player_seasons' Updated!")
    else:
        df_silver_seasons.write.format('delta').mode('overwrite').save(silver_seasons_path)
        print("New Silver 'player_seasons' Created!")


    
    # B. TRANSFORM & FLATTEN: PLAYER MATCHES
    
    print("\n Processing Player Matches...")

    df_matches_exploded = df_raw.select(
        col("player_name"),
        col("player_url"),
        explode(col("match_performance")).alias("match"),
        col("_metadata.extraction_timestamp").alias("extraction_timestamp")
    )

    df_silver_matches = df_matches_exploded.filter(col("match.Date") != "").select(
        col("player_name"),
        col("player_url"),
        col("match.Date").alias("match_date"),
        col("match.Home").alias("home_team"),
        col("match.Away").alias("away_team"),
        col("match.Score").alias("score"),
        col("match.Pos").alias("position"),
        
        # Casting stats to correct formats
        col("match.Min").cast("int").alias("minutes_played"),
        col("match.Sh").cast("int").alias("shots"),
        col("match.G").cast("int").alias("goals"),
        col("match.KP").cast("int").alias("key_passes"),
        col("match.A").cast("int").alias("assists"),
        col("match.xG").cast("float").alias("xg"),
        col("match.xA").cast("float").alias("xa"),
        
        to_timestamp(col("extraction_timestamp"), "yyyy-MM-dd HH:mm:ss").alias("updated_at"),
        lit(load_date_val).alias("load_date")
    )

    print("\n--- SILVER PLAYER MATCHES PREVIEW ---")
    df_silver_matches.show(5)

    
    # WRITE TO DELTA: PLAYER MATCHES
    silver_matches_path = "/opt/airflow/data_lake/silver/player_matches"
    df_silver_matches_clean = df_silver_matches.dropDuplicates(["player_name", "match_date"])

    if DeltaTable.isDeltaTable(spark, silver_matches_path):
        delta_table_matches = DeltaTable.forPath(spark, silver_matches_path)
        delta_table_matches.alias('target').merge(
            df_silver_matches_clean.alias('source'),
            """target.player_name = source.player_name
            AND target.match_date = source.match_date
            """
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
        print(" Silver 'player_matches' Updated!")
    else:
        df_silver_matches.write.format('delta').mode('overwrite').save(silver_matches_path)
        print(" New Silver 'player_matches' Created!")
        

# Run them sequentially
if __name__ == "__main__":
    try:
        spark = init_spark_session()
        process_league_standings(spark)
        process_team_matches_and_stats(spark)
        process_players(spark)
        
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        spark.stop()
        print("Spark Session Closed.")
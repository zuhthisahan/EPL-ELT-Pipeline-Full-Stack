import os
import json
from delta import configure_spark_with_delta_pip
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum, round, count, desc, asc

def init_spark():
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


#Delta to Json for API
def save_as_json_for_api(df, filename):
    """Saves a Spark DataFrame as a clean JSON file for the Node.js API."""
    api_dir = "/opt/airflow/data_lake/gold_api"
    os.makedirs(api_dir, exist_ok=True)
    
    # Use Spark's native JSON conversion to safely handle Dates and Decimals
    json_list = df.toJSON().collect()
    records = [json.loads(j) for j in json_list]
    
    api_filepath = os.path.join(api_dir, filename)
    with open(api_filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=4)
        
    print(f" Exported JSON for API: {filename}")



def process_gold_players(spark, season_start_date="2025-08-01"):
    print("\n Processing: gold_player_scoring_stats...")
    df_silver_matches = spark.read.format("delta").load("/opt/airflow/data_lake/silver/player_matches")
    # Filter for current season only
    df_current_season = df_silver_matches.filter(col("match_date") >= season_start_date)

    df_gold_players = df_current_season.groupBy("player_name").agg(
        count("match_date").alias("matches_played"),
        sum("minutes_played").alias("total_minutes"),
        sum("goals").alias("total_goals"),
        sum("assists").alias("total_assists"),
        round(sum("xg"), 2).alias("total_xg"),
        round(sum("xa"), 2).alias("total_xa")
    ).withColumn(
        "xg_performance", round(col("total_goals") - col("total_xg"), 2)
    ).filter(col("total_minutes") > 0).orderBy(desc("total_goals"))

    # df_rosters = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_rosters")
    
    
    
    # Save to Delta (For Data Lake history)
    df_gold_players.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/player_scoring_stats")
    print(" Saved: player_scoring_stats (Delta)")
    
    # Save to JSON (For the Web App)
    save_as_json_for_api(df_gold_players, "players.json")


def process_gold_teams(spark):
    print("\n Processing: Team Dashboards (Summary, Trends, Tactics)...")
    df_standings = spark.read.format("delta").load("/opt/airflow/data_lake/silver/league_standings")
    df_matches = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_matches")
    df_stats = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_statistics")

    try:
        df_fixtures = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_fixtures")
        df_fixtures.createOrReplaceTempView("fixtures")
    except:
        df_fixtures = None
    
    # Create temporary SQL views for matches and standings
    df_standings.createOrReplaceTempView("standings")
    df_matches.createOrReplaceTempView("matches")
    
    # Get the next 1 upcoming match per team
    if df_fixtures:
        df_next = spark.sql("""
            WITH RankedFixtures AS (
                SELECT team_name, opponent as next_opponent, home_away as next_home_away,
                ROW_NUMBER() OVER(PARTITION BY team_name ORDER BY fixture_date ASC) as rn
                FROM fixtures
            )
            SELECT team_name, next_opponent, next_home_away
            FROM RankedFixtures
            WHERE rn = 1                              
            """
        )
    else:
        df_next = spark.sql("SELECT team_name, 'TBD' as next_opponent, 'h' as next_home_away FROM standings")
        
    # Recent 5 results
    df_form = spark.sql("""
        WITH RankedMatches AS (
            SELECT team_name, match_date,
                   UPPER(result_status) as res, 
                   ROW_NUMBER() OVER(PARTITION BY team_name ORDER BY match_date DESC) as rn
            FROM matches
            WHERE result_status IS NOT NULL
        )
        SELECT team_name, collect_list(res) as form_array
        FROM RankedMatches
        WHERE rn <=5
        GROUP BY team_name
    """)
    
    df_form.createOrReplaceTempView("form_data")
    df_next.createOrReplaceTempView("next_data")
    
    
    # 1. Team Summary (Standings + Scatter Plot Data)
    df_gold_summary = spark.sql("""
        SELECT s.rank, s.team_name, s.matches_played, s.wins, s.draws, s.losses, s.points,
               s.goals_for, s.goals_against, (s.goals_for - s.goals_against) as goal_difference,
               f.form_array,
               n.next_opponent, n.next_home_away
        FROM standings s
        LEFT JOIN form_data f ON s.team_name = f.team_name
        LEFT JOIN next_data n ON s.team_name = n.team_name
        ORDER BY s.rank
    """)

    # 2. Team Match Trends (For Team-specific Line Graphs & Recent Results)
    df_gold_trends = df_matches.select(
        col("team_name"), col("match_date"), col("opponent"), col("home_away"),
        col("result_status"), col("goals_scored"), col("goals_conceded"),
        col("xg_for"), col("xg_against")
    ).orderBy("team_name", desc("match_date"))

    # 3. Team Tactics (Open Play vs Set Piece Table)
    df_gold_tactics = df_stats.filter(col("Situation").isNotNull()).select(
        col("team_name"), col("Situation").alias("play_type"),
        col("G").cast("int").alias("goals_scored"),
        col("xG").cast("float").alias("expected_goals"),
        col("Sh").cast("int").alias("total_shots"),
        col("xG/Sh").cast("float").alias("xg_per_shot")
    ).orderBy("team_name", desc("goals_scored"))

    # Save to Delta
    df_gold_summary.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/team_summary")
    df_gold_trends.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/team_match_trends")
    df_gold_tactics.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/team_tactics")
    print(" Saved: Team Summary, Trends, and Tactics (Delta)")
    
    # Save to JSON
    save_as_json_for_api(df_gold_summary, "team_summary_new.json")
    save_as_json_for_api(df_gold_trends, "team_trends.json")
    save_as_json_for_api(df_gold_tactics, "team_tactics.json")


def process_gold_league_schedules(spark):
    print("\n Processing: League-Wide Schedules (Home Page Lists)...")
    df_matches = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_matches")
    
    try:
        df_fixtures = spark.read.format("delta").load("/opt/airflow/data_lake/silver/team_fixtures")
    except:
        print(" Warning: silver/team_fixtures not found. Skipping upcoming fixtures.")
        df_fixtures = None

    # 1. Recent Results 
    df_recent = df_matches.filter(col("home_away") == "h").select(
        col("match_date"),
        col("team_name").alias("home_team"),
        col("goals_scored").alias("home_goals"),
        col("goals_conceded").alias("away_goals"),
        col("opponent").alias("away_team")
    ).orderBy(desc("match_date")).limit(20) 

    # Save Recent Results
    df_recent.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/league_recent_results")
    print("Saved: league_recent_results (Delta)")
    save_as_json_for_api(df_recent, "recent_results.json")

    # 2. Upcoming Fixtures 
    if df_fixtures:
        df_upcoming = df_fixtures.filter(col("home_away") == "h").select(
            col("fixture_date"), col("fixture_time"),
            col("team_name").alias("home_team"),
            col("opponent").alias("away_team")
        ).orderBy(asc("fixture_date")).limit(20)

        # Save Upcoming Fixtures
        df_upcoming.write.format("delta").mode("overwrite").save("/opt/airflow/data_lake/gold/league_upcoming_fixtures")
        print("Saved: league_upcoming_fixtures (Delta)")
        save_as_json_for_api(df_upcoming, "upcoming_fixtures.json")


# Main execution
if __name__ == "__main__":
    print("Starting Phase 3: Gold Layer Pipeline...")
    spark_session = init_spark()
    
    try:
        process_gold_players(spark_session)
        process_gold_teams(spark_session)
        process_gold_league_schedules(spark_session)
        print("\n ALL GOLD TABLES & API FILES GENERATED SUCCESSFULLY!")
    except Exception as e:
        print(f"\n Pipeline Failed: {e}")
    finally:
        spark_session.stop()
        print("Spark Session Closed.")
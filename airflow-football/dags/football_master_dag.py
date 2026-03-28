from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

# 1. Define the default settings for your pipeline
default_args = {
    'owner': 'data_engineer',
    'depends_on_past': False,
    'start_date': datetime(2026, 3, 20), # A date in the past so it can run immediately
    'retries': 1, # If a website timeout happens, try again once
    'retry_delay': timedelta(minutes=5),
}

# 2. Instantiate the DAG
with DAG(
    'football_medallion_pipeline',
    default_args=default_args,
    description='End-to-end Football Data Lake Pipeline',
    schedule_interval='@weekly', # Runs once a week!
    catchup=False,
    tags=['football', 'medallion', 'portfolio'],
) as dag:

    # 3. Define the Tasks (What scripts to run)
    # Notice the path: Docker mounts your local 'dags' folder to '/opt/airflow/dags' inside the container
    scrape_bronze = BashOperator(
        task_id='run_bronze_scraper',
        bash_command='python /opt/airflow/dags/bronze_scraper.py '
    )

    process_silver = BashOperator(
        task_id='run_silver_transformation',
        bash_command='python /opt/airflow/dags/silver_pipeline.py '
    )

    process_gold = BashOperator(
        task_id='run_gold_aggregations',
        bash_command='python /opt/airflow/dags/gold_pipeline.py '
    )

    # 4. Define the Order of Operations (The dependencies)
    # This is the magic of Airflow. The ">>" means "must succeed before running the next"
    scrape_bronze >> process_silver >> process_gold
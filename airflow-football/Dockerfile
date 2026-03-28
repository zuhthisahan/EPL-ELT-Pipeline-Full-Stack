# Start with the official Airflow image
FROM apache/airflow:2.9.0

# Switch to the 'root' user to install system-level apps (like Google Chrome)
USER root
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    openjdk-17-jre-headless \
    && apt-get clean

# Switch back to the 'airflow' user to install Python libraries safely
USER airflow
RUN pip install --no-cache-dir \
    pyspark==3.5.0 \
    delta-spark==3.1.0 \
    selenium \
    webdriver-manager
# ⚽ Premier League Analytics Hub & Medallion Data Lake

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Apache Airflow](https://img.shields.io/badge/Airflow-017CEE?style=for-the-badge&logo=Apache%20Airflow&logoColor=white)
![Apache Spark](https://img.shields.io/badge/Spark-E25A1C?style=for-the-badge&logo=Apache%20Spark&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white)

**Live Demo:** [https://football-frontend-lake.vercel.app/]

## 📖 Overview
Behind every sleek dashboard is a mountain of invisible data engineering. This project bridges the gap between heavy, scalable data architecture and full-stack web development. 

It is an end-to-end ELT pipeline and interactive web application that scrapes, processes, and visualizes advanced football statistics (like Expected Goals [xG] and Expected Assists [xA]). The goal of this project is to demonstrate how raw, continuous data streams can be transformed into a Medallion Architecture and served efficiently to drive tangible business outcomes and decision-making.

---

## 🏗️ System Architecture

The pipeline is designed to handle automated data extraction, heavy transformation, cloud storage, and rapid front-end delivery.

1. **Extraction:** Python scripts scrape raw football statistical data from external sources.
2. **Orchestration:** Apache Airflow (running in a local Docker container) schedules and manages the DAGs on a weekly basis.
3. **Transformation:** Apache Spark processes the raw data through a **Medallion Architecture**:
   * **Bronze Layer:** Raw, ingested data.
   * **Silver Layer:** Cleaned, filtered, and joined datasets.
   * **Gold Layer:** Business-level aggregates (Team Summaries, Player Metrics, Tactical Trends).
4. **Cloud Storage:** The final Gold Layer JSON artifacts are pushed to an **Amazon S3** Data Lake.
5. **Backend API:** A lightweight **Node.js/Express** server hosted on Render acts as a router, fetching the latest data from S3 and serving it to the client via REST endpoints.
6. **Frontend UI:** A dynamic, responsive **React (Vite)** application hosted on Vercel presents the data through an interactive dashboard.

---

## ✨ Key Features

* **Global Navigation:** Seamlessly switch between League Tables, Team Dashboards, and individual Player Profiles while maintaining global state.
* **Team Tactical Profiles:** Analyze underlying team performance metrics, including xG over/underperformance based on play types (Open Play, Corners, Set Pieces).
* **Interactive Performance Trends:** Custom dual-line charts built with Recharts displaying chronological xG For vs. xG Against, featuring interactive tooltips with opponent badge integration.
* **Advanced Player Scouting:** Visual progress bars mapping actual goals/assists against expected metrics (xG/xA), alongside automated "Similar Player" algorithms based on squad roles.

---

## 🛠️ Technology Stack

### Data Engineering & Pipeline
* **Apache Airflow:** Workflow orchestration and scheduling (Dockerized).
* **Apache Spark:** Distributed data processing and transformation.
* **Python:** Web scraping and data manipulation.
* **Amazon S3:** Cloud object storage for the data lake.

### Full-Stack Web Development
* **Frontend:** React.js, Vite, Tailwind CSS, Recharts.
* **Backend:** Node.js, Express.js, CORS.
* **Deployment:** Vercel (Frontend), Render.com (Backend).

---

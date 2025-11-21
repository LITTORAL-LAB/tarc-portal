from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from models.sensor_reading import SensorReading
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session


class MLAnalysisService:
    """Service para realizar análises de Machine Learning nos dados de sensores."""

    @staticmethod
    def _parse_time_range(time_range: str) -> timedelta:
        """Converte string de time_range para timedelta."""
        time_config = {
            "last_24h": timedelta(hours=24),
            "last_7_days": timedelta(days=7),
            "last_30_days": timedelta(days=30),
            "last_90_days": timedelta(days=90),
        }
        return time_config.get(time_range, timedelta(days=30))

    @staticmethod
    def _get_sensor_type_from_field(target_field: str) -> str:
        """Mapeia target_field para sensor_type no banco."""
        field_map = {
            "temperature": "temperatura",
            "rssi": "rssi",  # Se existir no banco
            "vazao": "fluxo",
        }
        return field_map.get(target_field, "temperatura")

    @staticmethod
    def _fetch_sensor_data(
        db: Session,
        target_field: str,
        time_range: str,
    ) -> Tuple[List[float], List[datetime]]:
        """Busca dados de sensores do banco de dados."""
        sensor_type = MLAnalysisService._get_sensor_type_from_field(target_field)
        time_delta = MLAnalysisService._parse_time_range(time_range)

        # Calcular período
        now = datetime.now(timezone.utc)
        start_time = now - time_delta

        # Buscar todas as leituras do tipo de sensor no período
        readings = (
            db.query(SensorReading)
            .filter(
                SensorReading.sensor_type == sensor_type,
                SensorReading.timestamp >= start_time,
            )
            .order_by(SensorReading.timestamp.asc())
            .all()
        )

        values = [reading.value for reading in readings]
        timestamps = [reading.timestamp for reading in readings]

        return values, timestamps

    @staticmethod
    def perform_clustering(
        db: Session,
        target_field: str,
        time_range: str,
        n_clusters: int = 3,
    ) -> Dict:
        """Realiza análise de clustering (K-Means) nos dados."""
        values, _ = MLAnalysisService._fetch_sensor_data(db, target_field, time_range)

        if len(values) < n_clusters:
            return {
                "error": f"Dados insuficientes. Necessário pelo menos {n_clusters} pontos, encontrado {len(values)}.",
                "clusters": [],
                "cluster_centers": [],
            }

        # Preparar dados para clustering
        x = np.array(values).reshape(-1, 1)

        # Normalizar dados
        scaler = StandardScaler()
        x_scaled = scaler.fit_transform(x)

        # Aplicar K-Means
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(x_scaled)

        # Calcular estatísticas por cluster
        cluster_stats = []
        for i in range(n_clusters):
            cluster_values = [values[j] for j in range(len(values)) if clusters[j] == i]
            if cluster_values:
                cluster_stats.append(
                    {
                        "cluster_id": int(i),
                        "count": len(cluster_values),
                        "mean": float(np.mean(cluster_values)),
                        "std": float(np.std(cluster_values)),
                        "min": float(np.min(cluster_values)),
                        "max": float(np.max(cluster_values)),
                    }
                )

        return {
            "n_clusters": n_clusters,
            "total_points": len(values),
            "cluster_centers": [
                float(c[0]) for c in scaler.inverse_transform(kmeans.cluster_centers_)
            ],
            "cluster_stats": cluster_stats,
            "inertia": float(kmeans.inertia_),
        }

    @staticmethod
    def perform_prediction(
        db: Session,
        target_field: str,
        time_range: str,
        forecast_steps: int = 10,
    ) -> Dict:
        """Realiza predição de valores futuros usando Random Forest."""
        values, timestamps = MLAnalysisService._fetch_sensor_data(
            db, target_field, time_range
        )

        if len(values) < 20:
            return {
                "error": f"Dados insuficientes. Necessário pelo menos 20 pontos, encontrado {len(values)}.",
                "predictions": [],
                "model_score": 0.0,
            }

        # Criar features temporais
        df = pd.DataFrame(
            {
                "value": values,
                "timestamp": timestamps,
            }
        )
        df["time_index"] = range(len(df))
        df["hour"] = df["timestamp"].apply(lambda x: x.hour)
        df["day_of_week"] = df["timestamp"].apply(lambda x: x.weekday())

        # Criar features de lag (valores anteriores)
        for lag in [1, 2, 3]:
            df[f"lag_{lag}"] = df["value"].shift(lag)

        # Remover linhas com NaN
        df = df.dropna()

        if len(df) < 10:
            return {
                "error": "Dados insuficientes após preparação.",
                "predictions": [],
                "model_score": 0.0,
            }

        # Preparar dados
        x = df[["time_index", "hour", "day_of_week", "lag_1", "lag_2", "lag_3"]].values
        y = df["value"].values

        # Dividir em treino e teste
        x_train, x_test, y_train, y_test = train_test_split(
            x, y, test_size=0.2, random_state=42
        )

        # Treinar modelo
        model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            min_samples_leaf=1,
            max_features="sqrt",
        )
        model.fit(x_train, y_train)

        # Score do modelo
        score = float(model.score(x_test, y_test))

        # Fazer predições futuras
        last_values = values[-3:]
        last_time_index = len(values) - 1
        last_timestamp = timestamps[-1]

        predictions = []
        for step in range(1, forecast_steps + 1):
            # Calcular features para o próximo passo
            next_time_index = last_time_index + step
            next_timestamp = last_timestamp + timedelta(hours=step)
            next_hour = next_timestamp.hour
            next_day_of_week = next_timestamp.weekday()

            # Usar valores previstos como lag (simplificado)
            lag_1 = last_values[-1] if len(last_values) >= 1 else values[-1]
            lag_2 = last_values[-2] if len(last_values) >= 2 else values[-1]
            lag_3 = last_values[-3] if len(last_values) >= 3 else values[-1]

            x_pred = np.array(
                [[next_time_index, next_hour, next_day_of_week, lag_1, lag_2, lag_3]]
            )
            pred_value = model.predict(x_pred)[0]

            predictions.append(
                {
                    "step": step,
                    "timestamp": next_timestamp.isoformat(),
                    "predicted_value": float(pred_value),
                }
            )

            # Atualizar last_values para próxima iteração
            last_values.append(pred_value)
            if len(last_values) > 3:
                last_values.pop(0)

        return {
            "model_score": score,
            "forecast_steps": forecast_steps,
            "predictions": predictions,
            "feature_importance": {
                col: float(imp)
                for col, imp in zip(
                    ["time_index", "hour", "day_of_week", "lag_1", "lag_2", "lag_3"],
                    model.feature_importances_,
                )
            },
        }

    @staticmethod
    def perform_classification(
        db: Session,
        target_field: str,
        time_range: str,
    ) -> Dict:
        """Realiza classificação de padrões nos dados (ex: normal/alto/baixo)."""
        values, timestamps = MLAnalysisService._fetch_sensor_data(
            db, target_field, time_range
        )

        if len(values) < 20:
            return {
                "error": f"Dados insuficientes. Necessário pelo menos 20 pontos, encontrado {len(values)}.",
                "classifications": [],
                "class_distribution": {},
            }

        # Criar classes baseadas em quartis
        q1 = np.percentile(values, 25)
        q2 = np.percentile(values, 50)  # mediana
        q3 = np.percentile(values, 75)

        def classify_value(val):
            if val < q1:
                return "baixo"
            elif val < q3:
                return "normal"
            else:
                return "alto"

        # Classificar todos os valores
        classifications = [
            {
                "timestamp": ts.isoformat(),
                "value": float(val),
                "class": classify_value(val),
            }
            for val, ts in zip(values, timestamps)
        ]

        # Distribuição de classes
        class_counts = {}
        for item in classifications:
            class_name = item["class"]
            class_counts[class_name] = class_counts.get(class_name, 0) + 1

        # Usar Random Forest para classificação mais sofisticada
        df = pd.DataFrame(
            {
                "value": values,
                "timestamp": timestamps,
            }
        )
        df["time_index"] = range(len(df))
        df["hour"] = df["timestamp"].apply(lambda x: x.hour)
        df["day_of_week"] = df["timestamp"].apply(lambda x: x.weekday())
        df["class"] = df["value"].apply(classify_value)

        # Features de lag
        for lag in [1, 2, 3]:
            df[f"lag_{lag}"] = df["value"].shift(lag)

        df = df.dropna()

        if len(df) >= 10:
            x = df[
                ["time_index", "hour", "day_of_week", "lag_1", "lag_2", "lag_3"]
            ].values
            y = df["class"].values

            x_train, x_test, y_train, y_test = train_test_split(
                x, y, test_size=0.2, random_state=42
            )

            classifier = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                min_samples_leaf=1,
                max_features="sqrt",
            )
            classifier.fit(x_train, y_train)
            accuracy = float(classifier.score(x_test, y_test))
        else:
            accuracy = 0.0

        return {
            "class_thresholds": {
                "baixo": float(q1),
                "normal": float(q2),
                "alto": float(q3),
            },
            "class_distribution": class_counts,
            "total_classified": len(classifications),
            "model_accuracy": accuracy,
            "classifications": classifications[:100],  # Limitar a 100 para resposta
        }

    @staticmethod
    def perform_analysis(
        db: Session,
        analysis_type: str,
        target_field: str,
        time_range: str,
    ) -> Dict:
        """Executa a análise solicitada."""
        if analysis_type == "clustering":
            return MLAnalysisService.perform_clustering(db, target_field, time_range)
        elif analysis_type == "prediction":
            return MLAnalysisService.perform_prediction(db, target_field, time_range)
        elif analysis_type == "classification":
            return MLAnalysisService.perform_classification(
                db, target_field, time_range
            )
        else:
            return {"error": f"Tipo de análise não suportado: {analysis_type}"}

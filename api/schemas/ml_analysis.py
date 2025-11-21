from enum import Enum

from pydantic import BaseModel


class AnalysisType(str, Enum):
    """Tipos de análise disponíveis."""

    CLUSTERING = "clustering"
    PREDICTION = "prediction"
    CLASSIFICATION = "classification"


class TargetField(str, Enum):
    """Campos disponíveis para análise."""

    TEMPERATURE = "temperature"
    RSSI = "rssi"
    VAZAO = "vazao"


class MLAnalysisRequest(BaseModel):
    """Schema para requisição de análise de ML."""

    dataset: str = "sensor_data"
    analysis_type: AnalysisType
    target_field: TargetField
    time_range: str = "last_30_days"  # last_30_days, last_7_days, last_24h, etc.


class MLAnalysisResponse(BaseModel):
    """Schema para resposta de análise de ML."""

    analysis_type: str
    target_field: str
    time_range: str
    results: dict
    metadata: dict
    message: str

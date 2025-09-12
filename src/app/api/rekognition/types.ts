interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Annotation = {
  class_id: number;
  score: number;
} & BoundingBox;

interface ImageSize {
  width: number;
  height: number;
  depth: number;
}

interface Prediction {
  annotations: Annotation[];
  image_size: ImageSize;
}

export interface SageMakerObjectDetectionResponse {
  predictions: Prediction[];
}

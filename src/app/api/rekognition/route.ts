import { NextRequest, NextResponse } from "next/server";
import {
  RekognitionClient,
  DetectCustomLabelsCommand,
  BoundingBox,
  DetectTextCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const PROJECT_ARN =
  "arn:aws:rekognition:ap-southeast-2:705229835130:project/find-my-horse-test-2/version/find-my-horse-test-2.2025-08-27T17.30.58/1756287057765";

const HORSE_IDS = {
  K131: "Prestige Good",
  H344: "Ping Hai Comet",
  J375: "Vigor Elleegant",
};

const detectText = async (imageBytes: Buffer) => {
  const command = new DetectTextCommand({
    Image: { Bytes: imageBytes },
  });

  const response = await rekognitionClient.send(command);
  return response.TextDetections || [];
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    console.log(`Processing image: ${file.name}, size: ${file.size} bytes`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new DetectCustomLabelsCommand({
      Image: {
        Bytes: buffer,
      },
      ProjectVersionArn: PROJECT_ARN,
      MinConfidence: 0, // confidence threshold
      MaxResults: 5,
    });

    const response = await rekognitionClient.send(command);
    console.log(
      `response: ${response.CustomLabels?.map((label) => label.Name).join(
        ", "
      )}`
    );

    const customLabels = response.CustomLabels || [];

    // highest-confidence entry per label name
    // const bestByLabel = new Map<
    //   string,
    //   { confidence: number; boundingBox?: BoundingBox }
    // >();
    // for (const label of customLabels) {
    //   const name = label.Name;
    //   if (!name) continue;
    //   const confidence = label.Confidence ?? 0;
    //   const existing = bestByLabel.get(name);
    //   if (!existing || confidence > existing.confidence) {
    //     bestByLabel.set(name, {
    //       confidence,
    //       boundingBox: label.Geometry?.BoundingBox,
    //     });
    //   }
    // }

    const results = customLabels.map((l) => ({
      name: l.Name,
      confidence: l.Confidence,
      boundingBox: l.Geometry?.BoundingBox,
    }));

    const textDetections = await detectText(buffer);

    console.log(
      `Detected text: ${textDetections
        .map((d) => d.DetectedText)
        .filter(Boolean)
        .join(", ")}`
    );
    if (textDetections.length > 0) {
      for (const d of textDetections) {
        const code = d.DetectedText?.trim().toUpperCase();
        const isHorseId = code && Object.keys(HORSE_IDS).includes(code);
        if (!code || !isHorseId) continue;
        const horseName = HORSE_IDS[code as keyof typeof HORSE_IDS];
        if (!horseName) continue;
        const match = results.find((r) => r.name === horseName);
        if (match) match.confidence = 100;
      }
    }

    return NextResponse.json({
      success: true,
      labels: results,
      totalLabels: results.length,
    });
  } catch (error) {
    console.error("Rekognition error:", error);

    if (error instanceof Error) {
      if (error.name === "ResourceNotReadyException") {
        return NextResponse.json(
          { error: "Model is not running, please start the model first." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

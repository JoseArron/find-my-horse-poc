import { NextRequest, NextResponse } from "next/server";
import {
  RekognitionClient,
  DetectCustomLabelsCommand,
  BoundingBox,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const PROJECT_ARN =
  "arn:aws:rekognition:ap-southeast-2:705229835130:project/find-my-horse-test-2/version/find-my-horse-test-2.2025-08-26T23.57.12/1756223833273";

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
      MaxResults: 20,
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

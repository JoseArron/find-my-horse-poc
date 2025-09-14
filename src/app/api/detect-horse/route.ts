import { NextRequest, NextResponse } from "next/server";
import {
  RekognitionClient,
  DetectCustomLabelsCommand,
  DetectTextCommand,
} from "@aws-sdk/client-rekognition";

import {
  InvokeEndpointCommand,
  SageMakerRuntimeClient,
} from "@aws-sdk/client-sagemaker-runtime";

import type { SageMakerObjectDetectionResponse } from "./types";

// const PROJECT_ARN =
//   "arn:aws:rekognition:ap-southeast-2:705229835130:project/find-my-horse-test-2/version/find-my-horse-test-2.2025-08-27T17.30.58/1756287057765";

const CONFIDENCE_THRESHOLD = 4; // percent

const CLASS_MAP = {
  0: "Prestige Good",
  1: "Vigor Elleegant",
  2: "Ping Hai Comet",
};

const HORSE_IDS = {
  K131: "Prestige Good",
  J375: "Vigor Elleegant",
  H344: "Ping Hai Comet",
};

const rekognitionClient = new RekognitionClient({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const sagemakerRuntimeClient = new SageMakerRuntimeClient({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

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

    // const command = new DetectCustomLabelsCommand({
    //   Image: {
    //     Bytes: buffer,
    //   },
    //   ProjectVersionArn: PROJECT_ARN,
    //   MinConfidence: 0, // confidence threshold
    //   MaxResults: 5,
    // });

    const command = new InvokeEndpointCommand({
      EndpointName: "find-my-horse-poc-endpoint",
      ContentType: "image/jpeg",
      Accept: "application/json;annotation=1",
      Body: buffer,
    });

    const response = await sagemakerRuntimeClient.send(command);

    if (!response.Body) {
      throw new Error("No response body from SageMaker endpoint");
    }

    // parse json from response body
    const responseJson = (await new Response(
      response.Body
    ).json()) as SageMakerObjectDetectionResponse;

    // const response = await rekognitionClient.send(command);
    console.log("SageMaker response:", JSON.stringify(responseJson, null, 2));

    const predictions = responseJson.predictions[0].annotations;

    console.log(`Total predictions: ${predictions.length}`);

    console.log(
      `response: ${[...predictions]
        .map((label) => CLASS_MAP[label.class_id as keyof typeof CLASS_MAP])
        .join(", ")}`
    );

    const results = predictions
      .filter(
        // filter out low confidence and invalid class IDs
        (l) =>
          l.score * 100 >= CONFIDENCE_THRESHOLD &&
          Object.keys(CLASS_MAP).includes(l.class_id.toString())
      )
      .map((l) => ({
        name: CLASS_MAP[l.class_id as keyof typeof CLASS_MAP],
        confidence: l.score * 100,
        boundingBox: {
          left: l.left / responseJson.predictions[0].image_size.width,
          top: l.top / responseJson.predictions[0].image_size.height,
          width: l.width / responseJson.predictions[0].image_size.width,
          height: l.height / responseJson.predictions[0].image_size.height,
        },
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
        console.log(`Found horse ID text: ${code}, name: ${horseName}`);
        if (!horseName) continue;
        const match = results.find((r) => r.name === horseName);
        if (match) {
          match.confidence = 100;
          console.log(
            `Matched horse ID ${code} to ${horseName} with confidence ${d.Confidence}`
          );
        }
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

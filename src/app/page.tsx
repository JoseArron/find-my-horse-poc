"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";

interface DetectedLabel {
  name: string;
  confidence: number;
}

interface AnalysisResults {
  success: boolean;
  labels: DetectedLabel[];
  totalLabels: number;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select an image file");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/rekognition", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
      } else {
        setError(data.error);
      }
    } catch {
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="title text-2xl">Find My Horse Test</CardTitle>
        <CardDescription>
          Upload a photo of your horse and check which horse it is
        </CardDescription>
        <div className="horse-list space-y-6">
          <div className="horse-item text-lg">
            <Label>Ping Hai Comet</Label>
            <Image
              src="/horses/ping-hai-comet.jpg"
              alt="Ping Hai Comet"
              width={200}
              height={200}
            />
          </div>
          <div className="horse-item text-lg">
            <Label>Prestige Good</Label>
            <Image
              src="/horses/prestige-good.jpg"
              alt="Prestige Good"
              width={200}
              height={200}
            />
          </div>
          <div className="horse-item text-lg">
            <Label>Vigor Elleegant</Label>
            <Image
              src="/horses/vigor-elleegant.jpg"
              alt="Vigor Elleegant"
              width={200}
              height={200}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label className="text-lg">Upload a photo of your horse</Label>
        <form onSubmit={handleSubmit} className="flex flex-row gap-2">
          <Input
            type="file"
            name="image"
            accept="image/*"
            required
            onChange={handleFileChange}
            className="w-fit"
          />
          <Button
            type="submit"
            className="submit-button"
            disabled={isAnalyzing || !selectedFile}
          >
            {isAnalyzing ? "Loading" : "Find My Horse"}
          </Button>
        </form>

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-left">
            {results.labels.length > 0 ? (
              <div className="labels-list">
                <h4 className="mb-4 font-semibold text-lg">Result:</h4>
                {results.labels.map((label: DetectedLabel) => {
                  const colorClass =
                    label.confidence <= 50
                      ? "confidence-low"
                      : label.confidence <= 80
                      ? "confidence-medium"
                      : "confidence-high";
                  return (
                    <div
                      key={label.name + label.confidence}
                      className={colorClass}
                    >
                      <strong>{label.name}</strong> - Confidence:{" "}
                      {label.confidence?.toFixed(2)}%
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No horses detected in this image.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

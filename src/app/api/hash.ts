import phash from "sharp-phash";

export const hashImage = async (imageBuffer: Buffer): Promise<string> => {
  const hash = await phash(imageBuffer);
  return hash;
};

import { configureCloudinary } from "@/lib/cloudinary";

export async function uploadFloorImage(params: {
  file: File;
  organizationId: string;
  buildingId: string;
  floorId: string;
}) {
  const cloudinary = configureCloudinary();
  const bytes = await params.file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${params.file.type || "image/jpeg"};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `xpaces/${params.organizationId}/${params.buildingId}`,
    public_id: `floor-${params.floorId}`,
    overwrite: true,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return {
    imageUrl: result.secure_url,
    imagePublicId: result.public_id,
  };
}

export async function deleteCloudinaryImage(publicId: string) {
  if (!publicId) {
    return;
  }
  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

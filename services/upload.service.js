const cloudinary = require("cloudinary").v2;
const config = require("../config/env");

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

function uploadBuffer(file, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(file.buffer);
  });
}

// Public images (profile photos, category images, work progress photos).
async function uploadImage(file, folder) {
  const result = await uploadBuffer(file, { folder: `superwise/${folder}` });
  return result.secure_url;
}

// Worker ID proofs are uploaded as "authenticated" assets: they have no public
// URL, so they can only be opened through a signed link.
async function uploadProof(file) {
  const result = await uploadBuffer(file, {
    folder: "superwise/proofs",
    type: "authenticated",
    resource_type: "auto",
  });
  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
  };
}

// A download link for a private proof that stops working after 5 minutes.
function signedProofUrl(proof) {
  return cloudinary.utils.private_download_url(proof.publicId, proof.format, {
    resource_type: proof.resourceType,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
  });
}

module.exports = { uploadImage, uploadProof, signedProofUrl };

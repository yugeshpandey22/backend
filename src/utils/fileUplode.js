const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");



// ✅ Cloudinary config sahi tarike se
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Function spelling thoda galat tha, but agar tum waise hi rakhna chahte ho toh rehne diya
const uploadeOnCloundinary = async (localfilePath) => {
  try {
    if (!localfilePath) return null;

    // ✅ Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localfilePath, {
      resource_type: "auto"
    });

    //console.log('file is uploaded on cloudinary', response.secure_url);
    return response;

  } catch (error) {
    // ✅ Local file delete safely
    if (fs.existsSync(localfilePath)) {
      fs.unlinkSync(localfilePath);
    }
    return null;
  }
};


module.exports = { cloudinary, uploadeOnCloundinary };

import userModel from "../models/userModel.js";

export const generateImage = async (req, res) => {
  try {
    const { userId, prompt } = req.body;

    // Validate request body
    if (!userId || !prompt) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Check user credit balance
    if (user.creditBalance <= 0) {
      return res.json({
        success: false,
        message: "No Credits Balance",
        creditBalance: user.creditBalance,
      });
    }

    // Prepare request to ClipDrop API
    const form = new FormData();
    form.append("prompt", prompt);

    const response = await fetch("https://clipdrop-api.co/text-to-image/v1", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLIPDROP_API,
      },
      body: form,
    });

    // Handle API errors
    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("ClipDrop API Error:", errorDetails);
      return res.json({ success: false, message: "Failed to generate image", error: errorDetails });
    }

    // Convert response to base64 image
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const resultImage = `data:image/png;base64,${base64Image}`;

    // Deduct one credit and save changes
    await userModel.findByIdAndUpdate(userId, {
      creditBalance: user.creditBalance - 1,
    });

    // Send response
    res.json({
      success: true,
      message: "Image Generated",
      creditBalance: user.creditBalance - 1,
      resultImage,
    });
  } catch (error) {
    console.error("Error generating image:", error.message);
    res.json({ success: false, message: "An error occurred", error: error.message });
  }
};

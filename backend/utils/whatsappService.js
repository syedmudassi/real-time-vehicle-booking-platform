import dotenv from "dotenv";

dotenv.config();

// Green API credentials
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const GREEN_API_ACCESS_TOKEN = process.env.GREEN_API_ACCESS_TOKEN;
const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "+92";

const normalizePhoneNumber = (phone) => {
  const raw = String(phone || "").trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const cleaned = raw.replace(/[^\d+]/g, "");
    return cleaned.length > 1 ? cleaned : null;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith("0")) {
    return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return `${DEFAULT_COUNTRY_CODE}${digits}`;
};

const isConfigured = () => {
  return Boolean(GREEN_API_INSTANCE_ID && GREEN_API_ACCESS_TOKEN);
};

const sendRequest = async (chatId, message) => {
  const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${GREEN_API_ACCESS_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatId: chatId,
      message: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Unknown Green API error");
  }

  const result = await response.json();
  return result;
};

export const sendWhatsAppMessage = async (to, body, options = {}) => {
  try {
    if (!isConfigured()) {
      console.warn(
        "WhatsApp notifications skipped: set GREEN_API_INSTANCE_ID and GREEN_API_ACCESS_TOKEN in .env",
      );
      return false;
    }

    const normalizedTo = normalizePhoneNumber(to);
    const messageBody = String(body || "").trim();

    if (!normalizedTo) {
      return false;
    }

    if (!messageBody) {
      return false;
    }

    // Convert phone number to Green API chat ID format (remove + and add @c.us)
    const chatId = normalizedTo.replace(/[^\d]/g, "") + "@c.us";

    await sendRequest(chatId, messageBody);
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error.message || error);
    return false;
  }
};

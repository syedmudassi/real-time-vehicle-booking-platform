import Car from "../models/carModel.js";
import path from "path";
import fs from "fs";
// GPS system disabled
// import { generateGpsVehicleId } from "../utils/generateGpsVehicleId.js";

export const createCar = async (req, res) => {
  try {
    const {
      make,
      model,
      dailyRate,
      category,
      description,
      year,
      color,
      seats,
      transmission,
      fuelType,
      mileage,
      status,
      // gpsEnabled,
      // gpsVehicleId,
    } = req.body;

    if (!make || !model || !dailyRate) {
      return res.status(400).json({
        message: "Make, model and dailyRate are required.",
      });
    }
    let imageFilename = req.body.image || "";
    if (req.file) {
      imageFilename = req.file.filename;
    }

    // GPS system disabled
    // const isGpsEnabled =
    //   gpsEnabled === true ||
    //   gpsEnabled === "true" ||
    //   gpsEnabled === 1 ||
    //   gpsEnabled === "1";

    const car = new Car({
      make,
      model,
      year: year ? Number(year) : undefined,
      color: color || "",
      category: category || "Sedan",
      seats: seats ? Number(seats) : 4,
      transmission: transmission || "Automatic",
      fuelType: fuelType || "Gasoline",
      mileage: mileage ? Number(mileage) : 0,
      dailyRate: Number(dailyRate),
      status: status || "available",
      // gpsEnabled: isGpsEnabled,
      // gpsVehicleId: isGpsEnabled ? String(gpsVehicleId || "").trim() : "",
      image: imageFilename || "",
      description: description || "",
    });

    // if (car.gpsEnabled && !car.gpsVehicleId) {
    //   car.gpsVehicleId = generateGpsVehicleId();
    // }

    const saved = await car.save();
    res.status(201).json(saved);
  } catch (err) {
     console.error("Create car error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

//GET FUNCTION TO FETCH CAR
export const getCars = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const status = req.query.status || "";

    const query = {};
    if (search) {
      query.$or = [
        { make: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const total = await Car.countDocuments(query);
    const cars = await Car.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const carsWithAvailability = cars.map((c) => {
      const plain = c.toObject ? c.toObject() : c;
      plain.availability = c.getAvailabilitySummary();
      return plain;
    });
    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: carsWithAvailability,
    });
  } catch (err) {
     console.error("Get Cars error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

//GET FUNCTION TO GET CAR BY ID
export const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    const plain = car.toObject();
    plain.availability = car.getAvailabilitySummary();
    res.json(plain);
  } catch (err) {
     console.error("Getting Car error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

export const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    if (req.file) {
      if (car.image) {
        const oldPath = path.join(process.cwd(), "uploads", car.image);
        fs.unlink(oldPath, (err) => {
          if (err) console.warn("Failed to delete old image:", err);
        });
      }
      car.image = req.file.filename;
    } else if (req.body.image !== undefined) {
      if (!req.body.image && car.image) {
        const oldPath = path.join(process.cwd(), "uploads", car.image);
        fs.unlink(oldPath, (err) => {
          if (err) console.warn("Failed to delete old image:", err);
        });
        car.image = "";
      }
    }

    const fields = [
      "make",
      "model",
      "year",
      "color",
      "category",
      "seats",
      "transmission",
      "fuelType",
      "mileage",
      "dailyRate",
      "status",
      "description",
      // "gpsVehicleId",
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (["year", "seats", "mileage", "dailyRate"].includes(f))
          car[f] = Number(req.body[f]);
        else car[f] = req.body[f];
      }
    });

    // GPS system disabled
    // if (req.body.gpsEnabled !== undefined) {
    //   car.gpsEnabled =
    //     req.body.gpsEnabled === true ||
    //     req.body.gpsEnabled === "true" ||
    //     req.body.gpsEnabled === 1 ||
    //     req.body.gpsEnabled === "1";
    // }
    //
    // if (car.gpsEnabled && !String(car.gpsVehicleId || "").trim()) {
    //   car.gpsVehicleId = generateGpsVehicleId();
    // }
    //
    // if (!car.gpsEnabled) {
    //   car.gpsVehicleId = "";
    // }

    const updated = await car.save();
    res.json(updated);
  } catch (err) {
     console.error("Update car error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

//delete method
export const deleteCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    if (car.image) {
        const filePath = path.join(process.cwd(), 'uploads', car.image);
        fs.unlink(filePath, (err) => { if (err) console.warn('Failed to delete image file:', err);});
    }

    res.json({ message: 'Car deleted successfully!'})
  } catch (err) {
     console.error("Delete car error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

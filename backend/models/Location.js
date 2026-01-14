const mongoose = require('mongoose');

/**
 * Reusable GeoJSON Point Schema
 * Follows the standard GeoJSON format:
 * {
 *   type: "Point",
 *   coordinates: [longitude, latitude]
 * }
 */
const PointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
    },
    coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
            validator: function (coords) {
                return Array.isArray(coords) && coords.length === 2;
            },
            message: 'Coordinates must be an array of [longitude, latitude]'
        }
    },
    address: {
        type: String,
        trim: true
    },
    city: String,
    country: String
}, { _id: false }); // No ID needed for embedded subdocument

module.exports = PointSchema;

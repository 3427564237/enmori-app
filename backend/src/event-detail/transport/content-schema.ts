const text = (max: number) => ({
  type: "string",
  minLength: 1,
  maxLength: max,
});
export const eventContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["provider", "sourceId", "fetchedAt", "timeZone", "detailUrl"],
  properties: {
    provider: { type: "string", enum: ["ticketmaster", "onepa"] },
    sourceId: text(160),
    fetchedAt: text(40),
    timeZone: { type: "string", const: "Asia/Singapore" },
    detailUrl: text(2048),
    bookingUrl: text(2048),
    fullDescription: text(30000),
    sections: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "text"],
        properties: { heading: text(100), text: text(12000) },
      },
    },
    detailsStatus: {
      type: "string",
      enum: ["available", "unavailable", "not_provided"],
    },
    status: {
      type: "string",
      enum: [
        "available",
        "sold_out",
        "cancelled",
        "postponed",
        "registration_closed",
        "unknown",
        "not_on_sale",
        "rescheduled",
      ],
    },
    priceLabel: text(500),
    registrationDeadline: text(100),
    areaCode: text(10),
    ...Object.fromEntries(
      ["minimumAge", "maximumAge", "targetMinimumAge", "targetMaximumAge"].map(
        (k) => [k, { type: "integer", minimum: 0, maximum: 150 }],
      ),
    ),
  },
} as const;
export const eventPresentationSchema = {
  locationLabel: text(300),
  shortDescription: text(1000),
  coverImageUrl: text(2048),
  content: eventContentSchema,
};

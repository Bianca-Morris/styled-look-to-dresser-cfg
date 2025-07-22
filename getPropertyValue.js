import { makeList } from "@s4tk/models/src/lib/common/helpers.js"

function getPropertyValue(
  type,
  decoder
) {
  switch (type) {
    // Existing cases...

    // Boolean values (e.g., B1, B2, B3)
    case ObjectDefinitionType.Boolean:
      return decoder.boolean();
    
    // Tags (e.g., Category, TagValue, TagValueNumber, CategoryNumber)
    case ObjectDefinitionType.Tags:
      return makeList(decoder.int32(), () => {
        const category = decoder.slice(decoder.uint32()).toString(); // Decode category as string
        const tagValue = decoder.slice(decoder.uint32()).toString(); // Decode tag value as string
        const tagValueNumber = decoder.uint32(); // Decode tagValueNumber as hex
        const categoryNumber = decoder.uint32(); // Decode categoryNumber as hex
        return { category, tagValue, tagValueNumber, categoryNumber };
      });

    // Swatch colors (e.g., "#FFFCDBD3")
    case ObjectDefinitionType.SwatchColors:
      return makeList(decoder.int32(), () => {
        return decoder.slice(decoder.uint32()).toString(); // Color string (e.g., "#FFFCDBD3")
      });
    
    // AgeGenderFlags (boolean fields and Value as a hex string)
    case ObjectDefinitionType.AgeGenderFlags:
      return {
        Baby: decoder.boolean(),
        Infant: decoder.boolean(),
        Toddler: decoder.boolean(),
        Child: decoder.boolean(),
        Teen: decoder.boolean(),
        YoungAdult: decoder.boolean(),
        Adult: decoder.boolean(),
        Elder: decoder.boolean(),
        Male: decoder.boolean(),
        Female: decoder.boolean(),
        Value: decoder.uint32() // Bitmask as hex value
      };

    // Hexadecimal values (e.g., U1, U2, NameHash, etc.)
    case ObjectDefinitionType.HexValue:
      return decoder.uint32();

    // Float and integer values (e.g., F1, S1)
    case ObjectDefinitionType.Float:
      return decoder.float();
    
    case ObjectDefinitionType.Int32:
      return decoder.int32();

    default:
      throw new Error(`Object Definition Type "${type}" not recognized.`);
  }
}

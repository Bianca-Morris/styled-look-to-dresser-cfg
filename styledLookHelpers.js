const AgeGenderFlags = {
    Baby: 0x00000001,        // Bit 1 ; Cannot be sure about this one - not in use
    Toddler: 0x00000002,     // Bit 2 (added for toddler)
    Child: 0x00000004,       // Bit 3
    Teen: 0x00000008,        // Bit 4
    YoungAdult: 0x00000010,  // Bit 5
    Adult: 0x00000020,       // Bit 6
    Elder: 0x00000040,       // Bit 7
    Infant: 0x000000080,     // Bit 8 
    Male: 0x00001000,        // Bit 13
    Female: 0x00002000,      // Bit 14
};

// Function to read age and gender flags
export function readAgeGenderFlags(ageGenderValue) {
    return {
        baby: (ageGenderValue & AgeGenderFlags.Baby) !== 0,
        infant: (ageGenderValue & AgeGenderFlags.Infant) !== 0,
        toddler: (ageGenderValue & AgeGenderFlags.Toddler) !== 0,
        child: (ageGenderValue & AgeGenderFlags.Child) !== 0,
        teen: (ageGenderValue & AgeGenderFlags.Teen) !== 0,
        youngAdult: (ageGenderValue & AgeGenderFlags.YoungAdult) !== 0,
        adult: (ageGenderValue & AgeGenderFlags.Adult) !== 0,
        elder: (ageGenderValue & AgeGenderFlags.Elder) !== 0,
        male: (ageGenderValue & AgeGenderFlags.Male) !== 0,
        female: (ageGenderValue & AgeGenderFlags.Female) !== 0,
        value: `0x${ageGenderValue.toString(16).toUpperCase().padStart(8, '0')}` // Return the hex value
    };
}

export const outfitCategoryTag = 70;

export const outfitCategoriesToStringMap = {
    70: "OutfitCategory",
    77: "OutfitCategory_Everyday",
    78: "OutfitCategory_Formal",
    80: "OutfitCategory_Athletic",
    81: "OutfitCategory_Sleep",
    83: "OutfitCategory_Party",
    1229: "OutfitCategory_Swimwear",
    2053: "OutfitCategory_HotWeather",
    2054: "OutfitCategory_ColdWeather"
}
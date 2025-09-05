import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import { statSync, writeFileSync, appendFileSync } from "fs";
import zlib from 'zlib';

import { Stack } from '@datastructures-js/stack';

import { Package } from "@s4tk/models";
import { registerPlugin } from "@s4tk/models/plugins.js";
import { makeList } from "@s4tk/models/lib/common/helpers.js"
import { BinaryDecoder } from "@s4tk/encoding";
import BufferFromFile from "@s4tk/plugin-bufferfromfile";

import { readAgeGenderFlags, outfitCategoryTag, outfitCategoriesToStringMap } from "./styledLookHelpers.js";

// Register the file buffer plugin
registerPlugin(BufferFromFile.default);

// TODO: get user-provided value via CLI flag or something
// Currently just testing with what I've got on hand
const TEST_RESOURCE_RELATIVE_PATH = "/styled_look_packages/SimplyAnjuta_BasegameLooks_Toddlers.package";

// Get the absolute path of the current file (similar to __filename)
const __filename = fileURLToPath(import.meta.url);
const __enclosingFolder = dirname(__filename);
const TEST_RESOURCE_ABSOLUTE_PATH = path.join(__enclosingFolder, TEST_RESOURCE_RELATIVE_PATH);

const STYLED_LOOK_FILE_TYPE_DECIMAL = 1908258978;
const SIM_INFO_FILE_TYPE_DECIMAL = 39769844;


generateMCCCConfig(TEST_RESOURCE_ABSOLUTE_PATH);

function generateMCCCConfig(absolutePathToPackageFile) {
    // Parse the package and pull out file info for styled looks and sim info files
    const { styledLookProperties = [], simInfoProperties = {} } = parsePackage(absolutePathToPackageFile);

    // Generate an array of lines for the config file based on the data in the two files
    const linesForConfigFile = generateLinesForConfigFile(styledLookProperties, simInfoProperties);
    // console.log("linesForConfigFile", linesForConfigFile);

    if (!linesForConfigFile.length) {
        console.log("No lines to write to config file! Terminating early.");
        return;
    } else {
        createOrWriteToConfig(linesForConfigFile);
        return;
    }
}

function parsePackage(absolutePathToFile) {
    console.log("Opening file at:  ", absolutePathToFile);

    // Open the package and start streaming the resources
    const resourceKeyPairs = Package.streamResources(absolutePathToFile);

    // Prepare a place to store the data
    let styledLookProperties = [];
    let simInfoProperties = {};

    // For each resource key pair, handle file parsing separately
    resourceKeyPairs.forEach((resource) => {
        // Grab resource key data
        const RESOURCE_TYPE_DECIMAL = resource.key.type;
        const RESOURCE_INSTANCE_DECIMAL = resource.key.instance;
        const RESOURCE_GROUP_DECIMAL = resource.key.group;
        
        // Decide how to handle file based on data available
        if (RESOURCE_TYPE_DECIMAL === STYLED_LOOK_FILE_TYPE_DECIMAL) {
            // Generating a simple array of file property objects here
            styledLookProperties.push(parseStyledLookResource(resource.value, RESOURCE_INSTANCE_DECIMAL));
        } else if (RESOURCE_TYPE_DECIMAL === SIM_INFO_FILE_TYPE_DECIMAL) {
            // We're keying by simInfo insance number to make it easier to find the specific outfits associated with a styledLook
            simInfoProperties[RESOURCE_INSTANCE_DECIMAL.toString(16).toUpperCase()] = parseSimInfoResource(resource.value);
        } else {
            // console.log("Skipping file with resource key: ", 
            //     RESOURCE_TYPE_DECIMAL.toString(16) + "-" + RESOURCE_GROUP_DECIMAL.toString(16) + "-" + RESOURCE_INSTANCE_DECIMAL.toString(16))
        }
    });

    // Return the data for each relevant file type
    return { styledLookProperties, simInfoProperties };
}

function parseStyledLookResource(rawResource, resourceInstanceNumber) {
    // As we decode the file, we'll add to an object of file properties
    const properties = {};

    let compressedBuffer = rawResource._bufferCache.buffer;

    try {
        // Magic # starts with "78 da", so it looks like these files are compressed
        // using zlib; need to use zlib to decompress them
        let decompressedBuffer = zlib.inflateSync(compressedBuffer);

        const decoder = new BinaryDecoder(decompressedBuffer);

        // Start decoding from top of the file
        properties.version = decoder.uint32();
        properties.ageGender = readAgeGenderFlags(decoder.uint32());
        properties.prototypeId = decoder.uint64();
        properties.b1 = decoder.byte();
        properties.b2 = decoder.byte();
        properties.simInfoInstance = decoder.uint64().toString(16).toUpperCase();
        properties.gradientTextureInstance = decoder.uint64().toString(16).toUpperCase();
        properties.cameraPoseTuningInstance = decoder.uint64().toString(16).toUpperCase();
        properties.nameHash = decoder.uint32().toString(16).toUpperCase();
        properties.descriptionHash = decoder.uint32().toString(16).toUpperCase();
        properties.unknown2 = decoder.bytes(14); // 14-byte unknown field
        properties.unknown3 = decoder.uint16();
        properties.s1 = decoder.uint16();
        
        // Animation references and state names
        properties.poseAnimationStateMachine = decoder.uint64().toString(16).toUpperCase();
        properties.poseAnimationStateMachineKey = decoder.slice(decoder.uint32()).toString();      
        properties.thumbnailAnimationStateMachine = decoder.uint64().toString(16).toUpperCase();
        properties.thumbnailAnimationStateMachineKey = decoder.slice(decoder.uint32()).toString();;
        
        // Placeholder parser for colorList
        properties.colorList = makeList(decoder.byte(), () => {
            return decoder.uint32().toString(16); // Color string (e.g., "#FFFCDBD3")
        })
        
        // Placeholder parser for tags
        properties.numTags = decoder.byte();
        properties.tags = makeList(properties.numTags, (index) => {
            if (index == 0) {
                decoder.bytes(3);
            }
            const tagValueNumber = decoder.uint16();
            const categoryNumber = decoder.uint16();
            decoder.bytes(2);
            return { tagValueNumber, categoryNumber };
        });  

        // Ensure memory is released for garbage collection
        decompressedBuffer = null;

        if (properties.simInfoInstance === '7748A55850C54361') {
            console.log(properties, resourceInstanceNumber);
        }
    } catch (err) {
        console.error('Error during decompression and/or parsing of resource:', err);
    }

    // Again, ensure the memory is released for garbage collection
    compressedBuffer = null;

    // Return the JS object with properties from this file
    return properties;
}

function parseSimInfoResource(rawResource) {
    // As we decode the file, we'll add to an object of file properties
    const properties = {};

    let compressedBuffer = rawResource._bufferCache.buffer;

    try {
        // Magic # starts with "78 da", so it looks like these files are compressed
        // using zlib; need to use zlib to decompress them
        let decompressedBuffer = zlib.inflateSync(compressedBuffer);

        const decoder = new BinaryDecoder(decompressedBuffer);

        // Primary Data Block
        properties.version = decoder.uint32();
        const file_version = properties.version;
        properties.offset_LinkList = decoder.uint32();
        
        const dataStart = decoder.tell();

        // Physique
        properties.physique = {
            heavy: decoder.float(),
            fit: decoder.float(),
            lean: decoder.float(),
            bony: decoder.float(),
            hips_wide: decoder.float(),
            hips_narrow: decoder.float(),
            waist_wide: decoder.float(),
            waist_narrow: decoder.float()
        };

        // Identity
        properties.age = decoder.uint32();
        properties.gender = decoder.uint32();
        
        if (file_version > 18) {
            properties.species = decoder.uint32();
            properties.unknown1 = decoder.uint32();
        }

        if (file_version >= 32) {
            const numPronouns = decoder.int32();
            // Skipping pronoun parsing TODO: maybe is needed for some files? IDK
            // properties.pronouns = makeList(numPronouns, () => { ... });
        }

        // Appearance
        properties.skintoneRef = decoder.uint64().toString(16).toUpperCase();
        if (file_version >= 28) {
            properties.skintoneShift = decoder.float();
        }

        if (file_version > 19) {
            const numPeltLayers = decoder.byte();
            properties.peltLayers = makeList(numPeltLayers, () => {
                return {
                    peltLayerRef: decoder.uint64().toString(16).toUpperCase(),
                    color: decoder.uint32().toString(16).toUpperCase()
                };
            });
        }

        const numSculpts = decoder.byte();
        properties.sculpts_indices = makeList(numSculpts, () => decoder.byte());

        const numFaceModifiers = decoder.byte();
        properties.faceModifiers = makeList(numFaceModifiers, () => {
            return {
                modifierKeyIndex: decoder.byte(),
                weight: decoder.float()
            };
        });

        const numBodyModifiers = decoder.byte();
        properties.bodyModifiers = makeList(numBodyModifiers, () => {
            return {
                modifierKeyIndex: decoder.byte(),
                weight: decoder.float()
            };
        });
        
        // Voice
        properties.voiceActor = decoder.uint32();
        properties.voicePitch = decoder.float();
        properties.voiceEffect = decoder.uint64().toString(16).toUpperCase();
        
        properties.unknown2 = decoder.uint32();
        properties.unknown3 = decoder.uint32();
        
        // Outfit Info
        const numSimOutfits = decoder.uint32();
        properties.simOutfits = makeList(numSimOutfits, () => {
            const category = decoder.byte();
            const unknown = decoder.uint32();
            const outfitDescCount = decoder.uint32();
            const outfits = makeList(outfitDescCount, () => {
                const outfitID = decoder.uint64().toString(16).toUpperCase();
                const outfitFlags = decoder.uint64().toString(16).toUpperCase();
                const created = decoder.uint64().toString(16).toUpperCase();
                const matchHair = decoder.byte();
                const partEntryCount = decoder.uint32();
                const partEntries = makeList(partEntryCount, () => {
                    return {
                        partKeyIndex: decoder.byte(),
                        bodyType: decoder.uint32(),
                        colorshift: decoder.uint64().toString(16).toUpperCase()
                    };
                });
                return { outfitID, outfitFlags, created, matchHair, partEntries };
            });
            return { category, unknown, outfits };
        });
        
        // Genetics Info
        const numSculptsGenetic = decoder.byte();
        properties.sculptsGenetic_indices = makeList(numSculptsGenetic, () => decoder.byte());

        const numFaceModifiersGenetic = decoder.byte();
        properties.faceModifiersGenetic = makeList(numFaceModifiersGenetic, () => {
            return {
                modifierKeyIndex: decoder.byte(),
                weight: decoder.float()
            };
        });

        const numBodyModifiersGenetic = decoder.byte();
        properties.bodyModifiersGenetic = makeList(numBodyModifiersGenetic, () => {
            return {
                modifierKeyIndex: decoder.byte(),
                weight: decoder.float()
            };
        });
        
        properties.genetic_physique = {
            heavy: decoder.float(),
            fit: decoder.float(),
            lean: decoder.float(),
            bony: decoder.float()
        };

        const numCASPartsGenetic = decoder.byte();
        properties.CASPartsGenetic = makeList(numCASPartsGenetic, () => {
            return {
                partKeyIndex: decoder.byte(),
                bodyType: decoder.uint32()
            };
        });
        
        if (file_version >= 32) {
            const numGrowthPartsGenetic = decoder.byte();
            properties.GrowthPartsGenetic = makeList(numGrowthPartsGenetic, () => {
                return {
                    partKeyIndex: decoder.byte(),
                    bodyType: decoder.uint32()
                };
            });
        }
        
        properties.voiceActorGenetic = decoder.uint32();
        properties.voicePitchGenetic = decoder.float();
        
        // Traits & Aspiration
        properties.flags = decoder.byte();
        properties.aspirationRef = decoder.uint64().toString(16).toUpperCase();
        
        if (file_version >= 32) {
            properties.unknown4 = decoder.bytes(3);
        }
        
        const numTraits = decoder.byte();
        properties.traitRefs = makeList(numTraits, () => decoder.uint64().toString(16).toUpperCase());
        
        // TGI Resource Key Link List
        decoder.seek(dataStart + properties.offset_LinkList);
        const linkListCount = decoder.byte();
        properties.LinkList = makeList(linkListCount, () => {
            return {
                Instance: decoder.uint64().toString(16).toUpperCase(),
                Group: decoder.uint32().toString(16).toUpperCase(),
                Type: decoder.uint32().toString(16).toUpperCase()
            };
        });

        // Ensure memory is released for garbage collection
        decompressedBuffer = null;
    } catch (err) {
        console.error('Error during decompression and/or parsing of resource:', err);
    }

    // Again, ensure the memory is released for garbage collection
    compressedBuffer = null;

    // Return the JS object with properties from this file
    return properties;
}

/**
 * Return an array of strings that can be written to a config file
 * @returns array of strings
 */
function generateLinesForConfigFile(styledLookProperties, simInfoProperties) {
    // Each line will be a string representing an outfit for a particular age and gender
    const lines = [];

    styledLookProperties.forEach(styledLookPropertyFile => {

        // Find what simInfoProperties correspond with the current styledLookProperties
        const currSimInfo = simInfoProperties[styledLookPropertyFile.simInfoInstance];
        if (!currSimInfo) {
            console.error("Couldn't find simInfo data for the current outfit; skipping styled look.")
            return;
        }

        // Now need to generate the arrays we'll get the stacks from
        const {
            0: genders = [],
            1: ages = [],
            2: outfitCategories = []
        } = populateAgeGenderOutfitCategoryArrays(styledLookPropertyFile);


        // Need to generate the outfit parts from the sim info properties
        const outfitPartsString = generateOutfitPartsString(currSimInfo, outfitCategories);

        
        const gendersStack = Stack.fromArray(genders);
        // Cloning the age & categories array because it may need to be regenerated
        let agesStack = Stack.fromArray(ages.slice());

        let outfitCategoriesStack = Stack.fromArray(outfitCategories.slice());

        // Iterate through both genders
        while (gendersStack.size() > 0) {
            const currentGender = gendersStack.pop(); // Get the last gender from the stack
            
            // Iterate through all ages for the current gender
            while (agesStack.size() > 0) {
                const currentAge = agesStack.pop(); // Get the last age from the stack
                
                // Iterate through all compatible outfit categories for the current age and gender
                while (outfitCategoriesStack.size() > 0) {
                    const currentOutfitCategory = outfitCategoriesStack.pop(); // Get the last outfit category from the stack
                    // Create the combination string; O marks that this is the beginning of an outfit config line
                    const configLine = `O.${currentGender}.${currentAge},${currentOutfitCategory},${outfitPartsString}`;

                    // Add the generated line to the configLines array
                    lines.push(configLine);
                }

                // After finishing with the outfit categories for the current age and gender,
                // we need to "reset" the outfit categories array for the next age/gender combo
                outfitCategoriesStack = Stack.fromArray(outfitCategories.slice());              
            }
            
            // After finishing with all ages for the current gender, "reset" the age array for the next gender
            agesStack = Stack.fromArray(ages.slice());
        }
    });

    console.log("lines", lines);
    return lines;
}

function populateAgeGenderOutfitCategoryArrays(styledLookProperties) {
    const genders = [];
    const ages = [];
    const outfitCategories = [];

    // Add the genders appropriate for this styled look to the stack
    if (styledLookProperties.ageGender.male) {
        genders.push("M");
    }
    if (styledLookProperties.ageGender.female) {
        genders.push("F");
    }

    // Add the ages appropriate for this styled look to the stack
    if (styledLookProperties.ageGender.infant) {
        ages.push("I");
    }
    if (styledLookProperties.ageGender.toddler) {
        ages.push("TD");
    }
    if (styledLookProperties.ageGender.child) {
        ages.push("CH");
    } 
    if (
        // Note: mc_dresser.cfg groups outfits for teens, young adults and adults
        styledLookProperties.ageGender.teen ||
        styledLookProperties.ageGender.youngAdult ||
        styledLookProperties.ageGender.adult
    ) {
        ages.push("YA");
    }
    if (styledLookProperties.ageGender.elder) {
        ages.push("EL");
    }

    // Add the outfit categories appropriate for this styled look to the stack
    styledLookProperties.tags.forEach((tag) => {
        // If this tag represents an outfit category
        if (tag.tagValueNumber === outfitCategoryTag) {
            // Convert the tag number to MCCC_cfg compatible string and push to array
            outfitCategories.push(outfitCategoriesToStringMap[tag.categoryNumber]);
        }
    })

    return [genders, ages, outfitCategories];
}


function generateOutfitPartsString(simInfoProperties, outfitCategories) {
    if (outfitCategories.length === 0) {
        console.error("No outfit categories available for this styled look!");
        return;
    }
    console.log("==============================================================================");
    const keyMap = {
        0: "E",
        1: "F",
        2: "At",
        3: "Sl",
        4: "P",
        9: "Sw",
        10: "Hw",
        11: "Cw"
    };
    const simOutfits = simInfoProperties?.simOutfits;

    // Identify the outfit of interest
    let outfitOfInterest;
    simOutfits.forEach(simOutfit => {
        // TODO: Taking the first one from each list; maybe a too big assumption. We'll see.
        if (keyMap[simOutfit.category] ===  "E") { //outfitCategories[0]) {
            outfitOfInterest = simOutfit.outfits[0];
        }
    });

    // Process part entries into string
    if (!outfitOfInterest) return;
    console.log("outfitOfInterest", outfitOfInterest);
    return processPartEntries(outfitOfInterest.partEntries, simInfoProperties.LinkList);
}

function processPartEntries(partEntriesArr, linkList) {
    let entryString = "";
    // Grab all the cas parts and populate the string with them
    partEntriesArr.forEach((partEntry, i) => 
        {
            const tgi = linkList[partEntry.partKeyIndex];
            const instance = tgi.Instance.padStart(16, "0");
            entryString += partEntry.bodyType + ":0x"+ instance;
            if (i !== partEntriesArr.length - 1) {
                entryString += ".";
            }
    });
    // console.log("entryString", entryString);
    return entryString;
}

function createOrWriteToConfig(lines) {
    // TODO: For now, assuming this is in the same folder as source... in future will want to 
    // update to use the Sims 4/Mods folder for the current user
    const configFileAbsolutePath = path.join(__enclosingFolder, "mc_dresser.cfg");

    const linesStr = lines.join('\n');

    // Check for existence of mc_dresser.cfg
    try {
        const fsStats = statSync(configFileAbsolutePath, { throwIfNoEntry: false });
        if (!fsStats) { // this is undefined when file is not found
            // create the file and write to it
            writeFileSync(configFileAbsolutePath, linesStr, { encoding: 'utf8' });
            console.log("Successfully wrote file!");
        } else {
            // open the file and append to it
            appendFileSync(configFileAbsolutePath, '\n' + linesStr, { encoding: 'utf8' });
            console.log("Successfully appended to file!");
        }
    } catch (error) {
        console.error("Error writing to config: " + error.message);
    }
}
import path, { dirname } from "path";
import { fileURLToPath } from 'url';
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
const TEST_RESOURCE_RELATIVE_PATH = "/styled_look_packages/SimplyAnjuta_BasegameLooksF_NoAppliedMakeUp.package";

// Get the absolute path of the current file (similar to __filename)
const __filename = fileURLToPath(import.meta.url);
const TEST_RESOURCE_ABSOLUTE_PATH = path.join(dirname(__filename), TEST_RESOURCE_RELATIVE_PATH);

const STYLED_LOOK_FILE_TYPE_DECIMAL = 1908258978;
const SIM_INFO_FILE_TYPE_DECIMAL = 39769844;


generateMCCCConfig(TEST_RESOURCE_ABSOLUTE_PATH);

function generateMCCCConfig(absolutePathToPackageFile) {
    // Parse the package and pull out file info for styled looks and sim info files
    const { styledLookProperties = [], simInfoProperties = {} } = parsePackage(absolutePathToPackageFile);

    // Generate an array of lines for the config file based on the data in the two files
    const linesForConfigFile = generateLinesForConfigFile(styledLookProperties, simInfoProperties);

    if (!linesForConfigFile.length) {
        console.log("No lines to write to config file! Terminating early.");
        return;
    } else {
        // TODO: write the config file to same folder as source file for now
    }
    // console.log("linesForConfigFile", linesForConfigFile);
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
            styledLookProperties.push(parseStyledLookResource(resource.value));
        } else if (RESOURCE_TYPE_DECIMAL === SIM_INFO_FILE_TYPE_DECIMAL) {
            // We're keying by simInfo insance number to make it easier to find the specific outfits associated with a styledLook
            simInfoProperties[RESOURCE_INSTANCE_DECIMAL.toString(16).toUpperCase()] = parseSimInfoResource(resource.value);
        } else {
            console.log("Skipping file with resource key: ", 
                RESOURCE_TYPE_DECIMAL.toString(16) + "-" + RESOURCE_GROUP_DECIMAL.toString(16) + "-" + RESOURCE_INSTANCE_DECIMAL.toString(16))
        }
    });

    // Return the data for each relevant file type
    return { styledLookProperties, simInfoProperties };
}

function parseStyledLookResource(rawResource) {
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

        // Start decoding from top of the file
        properties.version = decoder.uint32();

        //----------------------------------------------------------------
        // TODO: reverse engineer this gigantic monster file of doom
        //----------------------------------------------------------------

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

    // O marks that this is the beginning of an outfit config line
    styledLookProperties.forEach(styledLookPropertyFile => {

        // Find what simInfoProperties correspond with the current styledLookProperties
        const currSimInfo = simInfoProperties[styledLookPropertyFile.simInfoInstance];
        if (!currSimInfo) {
            console.error("Couldn't find simInfo data for the current outfit; skipping styled look.")
            return;
        }
        // Need to generate the outfit parts from the sim info properties
        const outfitPartsString = generateOutfitPartsString(currSimInfo);

        // Now need to generate the arrays we'll get the stacks from
        const {
            0: genders = [],
            1: ages = [],
            2: outfitCategories = []
        } = populateAgeGenderOutfitCategoryArrays(styledLookPropertyFile);
        
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
                    // Create the combination string
                    const configLine = `0.${currentGender}.${currentAge},${currentOutfitCategory},${outfitPartsString}`;

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


function generateOutfitPartsString(simInfoProperties) {
    return "TODO";
}
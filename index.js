import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import zlib from 'zlib';

import { Package } from "@s4tk/models";
import { registerPlugin } from "@s4tk/models/plugins.js";
import { makeList } from "@s4tk/models/lib/common/helpers.js"
import { BinaryDecoder } from "@s4tk/encoding";
import BufferFromFile from "@s4tk/plugin-bufferfromfile";

import { readAgeGenderFlags, outfitCategoryTag, outfitCategoriesToStringMap } from "./styledLookHelpers.js";

// Register the file buffer plugin
registerPlugin(BufferFromFile.default);

const TEST_RESOURCE_RELATIVE_PATH = "/styled_look_packages/SimplyAnjuta_BasegameLooksF_NoAppliedMakeUp.package";

// Get the absolute path of the current file (similar to __filename)
const __filename = fileURLToPath(import.meta.url);
const TEST_RESOURCE_ABSOLUTE_PATH = path.join(dirname(__filename), TEST_RESOURCE_RELATIVE_PATH);

const STYLED_LOOK_FILE_TYPE_DECIMAL = 1908258978;
const SIM_INFO_FILE_TYPE_DECIMAL = 39769844;

console.log(parsePackage(TEST_RESOURCE_ABSOLUTE_PATH));

function parsePackage(absolutePathToFile) {
    console.log("Opening file at:  ", absolutePathToFile);

    // Open the package and start streaming the resources
    const resourceKeyPairs = Package.streamResources(absolutePathToFile);

    // Prepare a place to store the data
    let styledLookProperties = [];
    let simInfoProperties = [];

    // For each resource key pair, handle file parsing separately
    resourceKeyPairs.forEach((resource) => {
        // Grab resource key data
        const RESOURCE_TYPE_DECIMAL = resource.key.type;
        const RESOURCE_INSTANCE_DECIMAL = resource.key.instance;
        const RESOURCE_GROUP_DECIMAL = resource.key.group;
        
        // Decide how to handle file based on data available
        if (RESOURCE_TYPE_DECIMAL === STYLED_LOOK_FILE_TYPE_DECIMAL) {
            styledLookProperties.push(parseStyledLookResource(resource.value));
        } else if (RESOURCE_TYPE_DECIMAL === SIM_INFO_FILE_TYPE_DECIMAL) {
            simInfoProperties.push(parseSimInfoResource(resource.value));
        } else {
            // console.log("Skipping file with resource key: ", 
            //     RESOURCE_TYPE_DECIMAL.toString(16) + "-" + RESOURCE_GROUP_DECIMAL.toString(16) + "-" + RESOURCE_INSTANCE_DECIMAL.toString(16))
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
        // Magic # starts with 78 da, so it looks like these files are compressed
        // using zlib; need to use zlib to decompress them
        const decompressedBuffer = zlib.inflateSync(compressedBuffer);

        const decoder = new BinaryDecoder(decompressedBuffer);

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
    } catch (err) {
        console.error('Error during decompression and/or parsing of resource:', err);
    }

    // Ensure the memory is released for garbage collection
    compressedBuffer = null;

    return properties;
}

function parseSimInfoResource(rawResource) {
    // TODO
    return {};
}

/**
 * Return an array of styledLookData to compile the cfg from
 * @returns array of styledLookDatum objects containing age, gender, outfit category, and outfit part data
 */
function getStyledLookData() {
	const styledLookData = [];

	// For each "Styled Look" in the package
	const styledLookDatum = {
		// simInfoInstance: "0x###############",
		ages: [],
		genders: [],
		outfitCategories: [],
	};

	// Add the SimInfoInstance number to the datum

	// Look through AgeGenderFlags

	    // Add array of compatible ages to the datum

	    // Populate with data

	    // Add array of compatible genders

	    // Populate with data

	// Look through Tags

	    // Add array of OutfitCategory tags

	// Return array of styled look data objects
	return styledLookData;
}

/**
 * Provided a list
 * @param {String[]} simInfoInstances an array of Strings containing simInfo file instane numbers (in 0x############### format)
 * @returnsan array of objects containing data about each outfit
 */
function populateDataSimInfoResource(simInfoInstances) {
	const data = [];

	// For each simInfoInstance

	    // Find the associated SimInfo file

            // Locate the Outfit data

                // For each outfit category

                // Collect info about the outfit category

        // Process the outfit

	// Return an array of objects containing data about each outfit
	return data;
}

/**
 * Provided an outfit PartData List
 */
function processOutfit() {}

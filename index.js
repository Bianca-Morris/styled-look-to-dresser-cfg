import { Package } from "@s4tk/models";
import { registerPlugin } from "@s4tk/models/plugins.js";
import { makeList } from "@s4tk/models/lib/common/helpers.js"
import { BinaryDecoder } from "@s4tk/encoding";
import BufferFromFile from "@s4tk/plugin-bufferfromfile";
import path, {dirname } from "path";
import { fileURLToPath } from 'url';
import zlib from 'zlib';

// Register the file buffer plugin
registerPlugin(BufferFromFile.default);

const TEST_RESOURCE_RELATIVE_PATH = "/styled_look_packages/SimplyAnjuta_BasegameLooksF_NoAppliedMakeUp.package";

// Get the absolute path of the current file (similar to __filename)
const __filename = fileURLToPath(import.meta.url);
const TEST_RESOURCE_ABSOLUTE_PATH = path.join(dirname(__filename), TEST_RESOURCE_RELATIVE_PATH);

// console.log(TEST_RESOURCE_ABSOLUTE_PATH);

// Open the package
const resourceKeyPairs = Package.streamResources(
	TEST_RESOURCE_ABSOLUTE_PATH
);
// console.log("resourceKeyPairs", resourceKeyPairs);

// resourceKeyPairs.forEach((resource) => {
//     if (resource.key.type === 39769844) {
//         console.log("resource", resource);
//         // console.log("resource.key.instance", resousrce.key.instance)
//     }
// });
//     if (resource.key.instance === 684964046824037473n) {
//         console.log("resource.value", resource.value);
//     }
// })

const resourceKeyPair = resourceKeyPairs[1].value;
console.log("resourceKeyPair", resourceKeyPairs[1]);
const buffer = resourceKeyPair._bufferCache.buffer;
// Decompress the buffer using zlib's inflate method
zlib.inflate(buffer, (err, decompressedBuffer) => {
    if (err) {
      console.error('Error decompressing buffer:', err);
    } else {
      // Now you can convert the decompressed buffer to a string (or process it as needed)
      const decompressedData = decompressedBuffer.toString('utf-8');
      const decoder = new BinaryDecoder(decompressedBuffer);

      const properties = {};

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
    function readAgeGenderFlags(ageGenderValue) {
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
    
      // Placeholder parsers for colorList and flagList
      properties.colorList = makeList(decoder.byte(), () => {
            return decoder.uint32().toString(16); // Color string (e.g., "#FFFCDBD3")
      })
      
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

    
    
    

      console.log("properties", properties);
    }
  });

// const decoder = readStbl.default(buffer);

// console.log("readStbl", readStbl);



// // Convert the buffer to a string
// const dataAsString = buffer.toString('hex');
// console.log("dataAsString", dataAsString);

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

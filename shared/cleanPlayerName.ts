/*
    ⚠ BEHOLD, THE RESULT OF TENS OF HOURS OF TESTING AND RESEARCH ⚠

    Building this code was not easy, took me many days of testing and research to get it right.
    Althought still not perfect, I believe this code is the best way to clean up player names.
    In general:
    - It removes spammy characters, like character repetitions and zalgo text
    - Does that without breaking scripts like hebreu and thai (or just a tiny bit)
    - It respects up to a single invisible character in the string, no matter which one
    - It does not break emoji variants that end up with 0xFE0E/0xFE0F
    - It does not break up any emoji, actually. THe only broken ones you will see are the ones that
        are already broken (likely due to missing 0xFE0E/0xFE0F)
    - It splits characters into valid Unicode CodePoints instead of UTF16 codepoints
    - All names are trimmed to 36 Unicode characters AFTER ALL THE CLEANING, which is a very
        generous limit and only affects about 0.1% of of all names (usually the spammy ones)
    - If the name is empty after any cleaning step, it will return a hex representation of the
        original name, prefixed with ∅, and that allows for it to be searched char-by-char
    - Removes all prefix invisible characters, or Nonspacing_Mark (diacritics) at the beginning
    - It should be impossible to have an invisible/empty name right now.
    - The code is not particularly optimized for performance, but should still clean up 1000 names
        in under a millisecond, which is more than enough for any use case.

    RESEARCH REFERENCES:
        https://unicode.org/Public/15.1.0/ucd/emoji/emoji-variation-sequences.txt
        https://unicode.org/Public/15.1.0/ucd/emoji/emoji-data.txt
        https://unicode.org/Public/emoji/latest/emoji-test.txt
        https://unicode.org/Public/emoji/latest/emoji-sequences.txt
        https://v8.dev/features/regexp-v-flag
        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets
        https://www.unicode.org/Public/UCD/latest/ucd/PropList.txt
*/


/**
 * Set of invisible characters generated by https://github.com/hediet/vscode-unicode-data
 * This also includes some characters that are removed prior to this step, namely:
 *  C0 controls, C1 controls, RTL marks, and RTL overrides
 */
const invisibleChars = new Set([
    0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020, 0x007F, 0x00A0, 0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180B, 0x180C, 0x180D, 0x180E, 0x1CBB, 0x1CBC, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x202F, 0x205F, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2065, 0x2066, 0x2067, 0x2068, 0x2069, 0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F, 0x2800, 0x3000, 0x3164, 0xFE00, 0xFE01, 0xFE02, 0xFE03, 0xFE04, 0xFE05, 0xFE06, 0xFE07, 0xFE08, 0xFE09, 0xFE0A, 0xFE0B, 0xFE0C, 0xFE0D, 0xFE0E, 0xFE0F, 0xFEFF, 0xFFA0, 0xFFF0, 0xFFF1, 0xFFF2, 0xFFF3, 0xFFF4, 0xFFF5, 0xFFF6, 0xFFF7, 0xFFF8, 0xFFFC, 0x133FC, 0x1D173, 0x1D174, 0x1D175, 0x1D176, 0x1D177, 0x1D178, 0x1D179, 0x1D17A, 0xE0000, 0xE0001, 0xE0002, 0xE0003, 0xE0004, 0xE0005, 0xE0006, 0xE0007, 0xE0008, 0xE0009, 0xE000A, 0xE000B, 0xE000C, 0xE000D, 0xE000E, 0xE000F, 0xE0010, 0xE0011, 0xE0012, 0xE0013, 0xE0014, 0xE0015, 0xE0016, 0xE0017, 0xE0018, 0xE0019, 0xE001A, 0xE001B, 0xE001C, 0xE001D, 0xE001E, 0xE001F, 0xE0020, 0xE0021, 0xE0022, 0xE0023, 0xE0024, 0xE0025, 0xE0026, 0xE0027, 0xE0028, 0xE0029, 0xE002A, 0xE002B, 0xE002C, 0xE002D, 0xE002E, 0xE002F, 0xE0030, 0xE0031, 0xE0032, 0xE0033, 0xE0034, 0xE0035, 0xE0036, 0xE0037, 0xE0038, 0xE0039, 0xE003A, 0xE003B, 0xE003C, 0xE003D, 0xE003E, 0xE003F, 0xE0040, 0xE0041, 0xE0042, 0xE0043, 0xE0044, 0xE0045, 0xE0046, 0xE0047, 0xE0048, 0xE0049, 0xE004A, 0xE004B, 0xE004C, 0xE004D, 0xE004E, 0xE004F, 0xE0050, 0xE0051, 0xE0052, 0xE0053, 0xE0054, 0xE0055, 0xE0056, 0xE0057, 0xE0058, 0xE0059, 0xE005A, 0xE005B, 0xE005C, 0xE005D, 0xE005E, 0xE005F, 0xE0060, 0xE0061, 0xE0062, 0xE0063, 0xE0064, 0xE0065, 0xE0066, 0xE0067, 0xE0068, 0xE0069, 0xE006A, 0xE006B, 0xE006C, 0xE006D, 0xE006E, 0xE006F, 0xE0070, 0xE0071, 0xE0072, 0xE0073, 0xE0074, 0xE0075, 0xE0076, 0xE0077, 0xE0078, 0xE0079, 0xE007A, 0xE007B, 0xE007C, 0xE007D, 0xE007E, 0xE007F, 0xE0100, 0xE0101, 0xE0102, 0xE0103, 0xE0104, 0xE0105, 0xE0106, 0xE0107, 0xE0108, 0xE0109, 0xE010A, 0xE010B, 0xE010C, 0xE010D, 0xE010E, 0xE010F, 0xE0110, 0xE0111, 0xE0112, 0xE0113, 0xE0114, 0xE0115, 0xE0116, 0xE0117, 0xE0118, 0xE0119, 0xE011A, 0xE011B, 0xE011C, 0xE011D, 0xE011E, 0xE011F, 0xE0120, 0xE0121, 0xE0122, 0xE0123, 0xE0124, 0xE0125, 0xE0126, 0xE0127, 0xE0128, 0xE0129, 0xE012A, 0xE012B, 0xE012C, 0xE012D, 0xE012E, 0xE012F, 0xE0130, 0xE0131, 0xE0132, 0xE0133, 0xE0134, 0xE0135, 0xE0136, 0xE0137, 0xE0138, 0xE0139, 0xE013A, 0xE013B, 0xE013C, 0xE013D, 0xE013E, 0xE013F, 0xE0140, 0xE0141, 0xE0142, 0xE0143, 0xE0144, 0xE0145, 0xE0146, 0xE0147, 0xE0148, 0xE0149, 0xE014A, 0xE014B, 0xE014C, 0xE014D, 0xE014E, 0xE014F, 0xE0150, 0xE0151, 0xE0152, 0xE0153, 0xE0154, 0xE0155, 0xE0156, 0xE0157, 0xE0158, 0xE0159, 0xE015A, 0xE015B, 0xE015C, 0xE015D, 0xE015E, 0xE015F, 0xE0160, 0xE0161, 0xE0162, 0xE0163, 0xE0164, 0xE0165, 0xE0166, 0xE0167, 0xE0168, 0xE0169, 0xE016A, 0xE016B, 0xE016C, 0xE016D, 0xE016E, 0xE016F, 0xE0170, 0xE0171, 0xE0172, 0xE0173, 0xE0174, 0xE0175, 0xE0176, 0xE0177, 0xE0178, 0xE0179, 0xE017A, 0xE017B, 0xE017C, 0xE017D, 0xE017E, 0xE017F, 0xE0180, 0xE0181, 0xE0182, 0xE0183, 0xE0184, 0xE0185, 0xE0186, 0xE0187, 0xE0188, 0xE0189, 0xE018A, 0xE018B, 0xE018C, 0xE018D, 0xE018E, 0xE018F, 0xE0190, 0xE0191, 0xE0192, 0xE0193, 0xE0194, 0xE0195, 0xE0196, 0xE0197, 0xE0198, 0xE0199, 0xE019A, 0xE019B, 0xE019C, 0xE019D, 0xE019E, 0xE019F, 0xE01A0, 0xE01A1, 0xE01A2, 0xE01A3, 0xE01A4, 0xE01A5, 0xE01A6, 0xE01A7, 0xE01A8, 0xE01A9, 0xE01AA, 0xE01AB, 0xE01AC, 0xE01AD, 0xE01AE, 0xE01AF, 0xE01B0, 0xE01B1, 0xE01B2, 0xE01B3, 0xE01B4, 0xE01B5, 0xE01B6, 0xE01B7, 0xE01B8, 0xE01B9, 0xE01BA, 0xE01BB, 0xE01BC, 0xE01BD, 0xE01BE, 0xE01BF, 0xE01C0, 0xE01C1, 0xE01C2, 0xE01C3, 0xE01C4, 0xE01C5, 0xE01C6, 0xE01C7, 0xE01C8, 0xE01C9, 0xE01CA, 0xE01CB, 0xE01CC, 0xE01CD, 0xE01CE, 0xE01CF, 0xE01D0, 0xE01D1, 0xE01D2, 0xE01D3, 0xE01D4, 0xE01D5, 0xE01D6, 0xE01D7, 0xE01D8, 0xE01D9, 0xE01DA, 0xE01DB, 0xE01DC, 0xE01DD, 0xE01DE, 0xE01DF, 0xE01E0, 0xE01E1, 0xE01E2, 0xE01E3, 0xE01E4, 0xE01E5, 0xE01E6, 0xE01E7, 0xE01E8, 0xE01E9, 0xE01EA, 0xE01EB, 0xE01EC, 0xE01ED, 0xE01EE, 0xE01EF,
]);


/**
 * Converts a string to a hex array of its characters.
 * Default limit of 35 characters to account for the ∅
 */
const hexInvalidString = (str: string, limit = 35) => {
    const hexArr = [...str].map(c => (c.codePointAt(0) ?? 0x00).toString(16));
    const outArr: string[] = [];
    let charCountWithSpace = 0;
    for (let i = 0; i < hexArr.length; i++) {
        if (outArr.includes(hexArr[i])) continue;
        if ((charCountWithSpace + hexArr[i].length) > limit) break
        outArr.push(hexArr[i]);
        charCountWithSpace += hexArr[i].length + 1; //account for space
    }
    return outArr;
}


/**
 * Checks if a character is an emoji.
 * TODO: this is not perfect, use @mathiasbynens/emoji-regex
 *  or await for NodeJS 20 and use the native regex /^\p{RGI_Emoji}$/v
 *  ref: https://v8.dev/features/regexp-v-flag
*  NOTE: also remove the library unicode-emoji-json, being used by the discord bot
 */
const isEmoji = (char: string) => {
    const codePoint = char.codePointAt(0)!;
    return (
        (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) || // Miscellaneous Symbols and Pictographs
        (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
        (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport and Map Symbols
        (codePoint >= 0x1F700 && codePoint <= 0x1F77F) || // Alchemical Symbols
        (codePoint >= 0x1F780 && codePoint <= 0x1F7FF) || // Geometric Shapes Extended
        (codePoint >= 0x1F800 && codePoint <= 0x1F8FF) || // Supplemental Arrows-C
        (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols and Pictographs
        (codePoint >= 0x1FA00 && codePoint <= 0x1FA6F) || // Chess Symbols
        (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF) || // Symbols and Pictographs Extended-A
        (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Miscellaneous Symbols
        (codePoint >= 0x2700 && codePoint <= 0x27BF)      // Dingbats
    );
}


/**
 * Objectives:
 * - remove leading invisible characters
 * - remove over 3 repeated chars
 * - remove any repeated invisible chars
 * - only allow a single trailing codepoint if it's 0xFE0E/0xFE0F and the previous char is an emoji
 * NOTE: need to use [...str] to split the string into unicode codepoints, otherwise they become UTF8 codepoints
 */
const cleanTrimCodePoints = (str: string, lenLimit = 36) => {
    let out = '';
    let lastChar = '';
    let lastCharCount = 0;
    let pendingInvisibleChar = '';
    let totalCodePoints = 0;
    const chars = [...str]; //do not use .split('')
    for (let i = 0; i < chars.length; i++) {
        //ensure size limit
        //NOTE: only about 0.1% of names are longer than 36 chars after cleaning
        if (totalCodePoints >= lenLimit) break;

        //remove leading invisible characters
        const currChar = chars[i];
        const currCharCodePoint = currChar.codePointAt(0)!;
        const isCharInvible = invisibleChars.has(currCharCodePoint);
        if (!out.length && isCharInvible) continue;

        //remove repeated chars
        const isCharRepeated = currChar === lastChar;
        if (isCharRepeated && lastCharCount >= (isCharInvible ? 1 : 3)) {
            continue;
        }

        //deal with trailing invisible chars
        let isCurrentPending = false;
        if (isCharInvible) {
            //if it's 0xFE0E/0xFE0F and the previous char is an emoji, don't hold it back
            const isVariationSelector = (currCharCodePoint === 0xFE0E || currCharCodePoint === 0xFE0F) && isEmoji(lastChar);
            if (!isVariationSelector) {
                //keep only the first pending
                if (!pendingInvisibleChar) {
                    pendingInvisibleChar = currChar;
                    isCurrentPending = true;
                }
                continue;
            }
        }
        if (!isCurrentPending && pendingInvisibleChar) {
            if (totalCodePoints >= lenLimit - 1) break;
            out += pendingInvisibleChar;
            totalCodePoints++;
            pendingInvisibleChar = '';
        }

        //append char
        lastChar = currChar;
        lastCharCount = isCharRepeated ? lastCharCount + 1 : 1;
        out += currChar;
        totalCodePoints++;
    }

    return out;
}

// Types
type TransformStep = (input: string) => string;
type CleanPlayerNameResult = {
    displayName: string;
    displayNameEmpty: boolean;
    pureName: string;
    pureNameEmpty: boolean;
};

// Constants
const EMPTY_SET = String.fromCodePoint(0x2205, 0x200B); // ∅


/**
 * Cleans up a player name and returns one version to be displayed, and one pure version to be used for fuzzy matching.
 * If the name does not contain any valid characters, it will return a searchable hex representation of the name.
*/
export default (originalName: string): CleanPlayerNameResult => {
    if (!originalName) {
        return {
            displayName: EMPTY_SET + 'EMPTY NAME',
            displayNameEmpty: true,
            pureName: 'emptyname',
            pureNameEmpty: true,
        };
    }

    //Order of operations:
    // 1. operations that remove the match completely
    // 2. operations that reduce the name
    // 3. finalization
    const displaySteps: TransformStep[] = [
        //should have been truncated by lua, but double checking due to the risk of DoS
        (x) => x.substring(0, 128),

        // https://docs.fivem.net/docs/game-references/text-formatting/
        // NOTE: never seen these being used: nrt|EX_R\*|BLIP_\S+|ACCEPT|CANCEL|PAD_\S+|INPUT_\S+|INPUTGROUP_\S+
        (x) => x.replace(/~(HUD_\S+|HC_\S+|[a-z]|[a1]_\d+|bold|italic|ws|wanted_star|nrt|EX_R\*|BLIP_\S+|ACCEPT|CANCEL|PAD_\S+|INPUT_\S+|INPUTGROUP_\S+)~/ig, ''),

        // console & chat color codes
        (x) => x.replace(/\^\d/ig, ''),

        // C0 controls + delete + C1 controls
        // \u200E               RTL mark
        // \u2067               RTL override
        (x) => x.replace(/[\p{Control}\u200E\u2067]/ug, ''),

        // \uA980-\uA9DF        javanese (oversized)
        // \u239B-\u23AD        Miscellaneous Technical — Bracket pieces items (oversized)
        // \u534D\u5350         swastika
        // \u1000-\u109F        Myanmar
        // \u0B80-\u0BFF        Tamil
        // \uFDFD\u2E3B         oversized characters
        (x) => x.replace(/[\uA980-\uA9DF\u239B-\u23AD\u534D\u5350\u1000-\u109F\u0B80-\u0BFF\uFDFD\u2E3B]/ug, ''),

        // UTF-16 ranges
        // U+12000 - U+123FF 	Cuneiform
        // U+12400 - U+1247F 	Cuneiform Numbers and Punctuation
        // U+12480 - U+1254F 	Early Dynastic Cuneiform
        // U+1D000 - U+1D0FF 	Byzantine Musical Symbols
        (x) => x.replace(/[\u{12000}-\u{123FF}\u{12400}-\u{1247F}\u{12480}-\u{1254F}\u{1D000}-\u{1D0FF}]/gu, ''),

        //2+ consecutive marks (zalgo text)
        (x) => x.replace(/(^\p{Nonspacing_Mark}+)|(\p{Nonspacing_Mark}{3,})/ug, (match, leading, repeating) => {
            if (leading) return ''; // Remove leading non-spacing marks
            if (repeating) return repeating.substring(0, 2); // Truncate sequences of three or more non-spacing marks to two
        }),

        // remove leading invisible characters
        // remove over 3 repeated chars, or any repeated invisible chars
        // only allow a single trailing codepoint if it's 0xFE0E/0xFE0F and the previous char is an emoji
        // trimming to 36 chars
        cleanTrimCodePoints,
    ];

    let prevDisplayName = originalName;
    for (const step of displaySteps) {
        const result = step(prevDisplayName);
        if (!result.length) {
            const prevHex = hexInvalidString(prevDisplayName);
            return {
                displayName: `${EMPTY_SET}${prevHex.join(' ').toUpperCase()}`,
                displayNameEmpty: true,
                pureName: prevHex.join(''),
                pureNameEmpty: true,
            };
        } else {
            prevDisplayName = result;
        }
    }
    const displayName = prevDisplayName;

    const pureSteps: TransformStep[] = [
        //convert characters to their canonical form for consistent comparison
        (x) => x.normalize('NFKC'),

        //remove non-letter, non-number
        (x) => x.replace(/[^\p{Letter}\p{Number}]/gu, ''),

        //lowercase
        (x) => x.toLocaleLowerCase(),
    ];

    let prevPureName = prevDisplayName;
    for (const step of pureSteps) {
        const result = step(prevPureName);
        if (!result.length) {
            const prevHex = hexInvalidString(prevPureName);
            return {
                displayName,
                displayNameEmpty: false,
                pureName: prevHex.join(''),
                pureNameEmpty: true,
            };
        } else {
            prevPureName = result;
        }
    }
    const pureName = prevPureName;

    return {
        displayName,
        displayNameEmpty: false,
        pureName,
        pureNameEmpty: false,
    };
};

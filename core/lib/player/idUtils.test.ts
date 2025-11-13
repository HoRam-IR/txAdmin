import { test, expect, suite, it } from 'vitest';
import * as idUtils from './idUtils';


test('parsePlayerId', () => {
    let result = idUtils.parsePlayerId('overfive:555555');
    expect(result.isIdValid).toBe(true);
    expect(result.idType).toBe('overfive');
    expect(result.idValue).toBe('555555');
    expect(result.idlowerCased).toBe('overfive:555555');

    result = idUtils.parsePlayerId('overfive:xxxxx');
    expect(result.isIdValid).toBe(false);
});

test('parsePlayerIds', () => {
    const result = idUtils.parsePlayerIds(['overfive:555555', 'overfive:xxxxx']);
    expect(result.validIdsArray).toEqual(['overfive:555555']);
    expect(result.invalidIdsArray).toEqual(['overfive:xxxxx']);
    expect(result.validIdsObject?.overfive).toBe('555555');
});

// test('filterPlayerHwids', () => {
//     const result = idUtils.filterPlayerHwids([
//         '65333333333335656363636',
//         'invalidHwid'
//     ]);
//     expect(result.validHwidsArray).toEqual(['65333333333335656363636']);
//     expect(result.invalidHwidsArray).toEqual(['invalidHwid']);
// });

test('parseLaxIdsArrayInput', () => {
    const result = idUtils.parseLaxIdsArrayInput('55555555000000009999, steam:1100001ffffffff, invalid');
    expect(result.validIds).toEqual(['discord:55555555000000009999', 'steam:1100001ffffffff']);
    expect(result.invalids).toEqual(['invalid']);
});

test('getIdFromOauthNameid', () => {
    expect(idUtils.getIdFromOauthNameid('https://forum.cfx.re/internal/user/555555')).toBe('overfive:555555');
    expect(idUtils.getIdFromOauthNameid('xxxxx')).toBe(false);
});

test('shortenId', () => {
    // Invalid ids
    expect(() => idUtils.shortenId(123 as any)).toThrow('id is not a string');
    expect(idUtils.shortenId('invalidFormat')).toBe('invalidFormat');
    expect(idUtils.shortenId(':1234567890123456')).toBe(':1234567890123456');
    expect(idUtils.shortenId('discord:')).toBe('discord:');

    // Valid ID with length greater than >= 10
    expect(idUtils.shortenId('discord:383919883341266945')).toBe('discord:3839…6945');
    expect(idUtils.shortenId('xbl:12345678901')).toBe('xbl:1234…8901');
    
    // Valid ID with length <= 10 (should not be shortened)
    expect(idUtils.shortenId('fivem:1234567890')).toBe('fivem:1234567890');
    expect(idUtils.shortenId('steam:1234')).toBe('steam:1234');
});

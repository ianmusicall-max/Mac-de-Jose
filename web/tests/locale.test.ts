import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localeForCountry} from '../lib/i18n/locale.ts';

test('maps Spanish-speaking South America and Spain to es',()=>{
 assert.equal(localeForCountry('AR'),'es');
 assert.equal(localeForCountry('pe'),'es');
 assert.equal(localeForCountry('ES'),'es');
});
test('maps Brazil and Portugal to pt',()=>{
 assert.equal(localeForCountry('BR'),'pt');
 assert.equal(localeForCountry('PT'),'pt');
});
test('defaults everyone else to en, including Mexico and non-Spanish South America',()=>{
 assert.equal(localeForCountry('US'),'en');
 assert.equal(localeForCountry('MX'),'en');
 assert.equal(localeForCountry('GB'),'en');
 assert.equal(localeForCountry('GY'),'en');
 assert.equal(localeForCountry(null),'en');
 assert.equal(localeForCountry(undefined),'en');
 assert.equal(localeForCountry(''),'en');
});

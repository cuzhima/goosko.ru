export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    // Parse parameters (compatible with existing frontend)
    const id = params.get('id') || '203';           // station numeric ID
    const a = params.get('a');                       // start date YYYY-MM-DD
    const b = params.get('b');                       // end date YYYY-MM-DD
    const mode = params.get('mode') || 'river_level'; // mode: river_level, precipitation, etc.
    const encoding = params.get('encoding') || '0';  // 0 = UTF-8
    const divider = params.get('divider') || '0';    // 0 = decimal point
    const point = params.get('point') || '0';        // time format
    
    if (!a || !b) {
      return new Response('Missing required params: a (start date) and b (end date)', { 
        status: 400,
        headers: getCorsHeaders()
      });
    }
    
    // Map old numeric IDs to new UUIDs (from pub.emercit.ru API)
    const stationMap = {
      "5": "215f07cb-ba20-4245-8532-e0426e347063",
      "10": "c4f2ac7e-e6de-4f52-8e21-a802fb8f0609",
      "11": "1f948694-1c98-4b36-b044-3bac519ed7a3",
      "12": "17699404-a683-4094-9bb0-9227f8b544e8",
      "13": "2675f10f-ce94-439f-b0eb-be925cba0479",
      "14": "f637e5ec-fb88-4fc5-af76-202ec6702767",
      "15": "38a4572e-2746-47ab-84af-bc9d88da5503",
      "16": "0f27b9d0-08da-4d6a-a57c-92525b818842",
      "17": "673ce650-07ee-4c3a-bca1-3c62391875e8",
      "18": "b94baeab-3223-4db2-8f01-72e732f56888",
      "19": "28415786-41ab-494a-9b0b-c630b0187d6c",
      "20": "752cf4b9-4346-426f-adc9-a97f3453b3d2",
      "21": "2201c3fc-1559-428d-92e9-fc60e3768bd5",
      "22": "721b4d9d-f490-456c-be60-739a7369febe",
      "23": "ceccb2d5-01c7-46d3-b715-7cedafa6a984",
      "24": "b414f02a-d0e8-4d08-919f-a227280d678f",
      "25": "0d4bb7e7-eaae-4655-a938-9c611a5902ef",
      "27": "204f4c7a-3784-43da-952c-ed214eb824ab",
      "28": "90d7edfa-040b-4980-8809-5e117558c7a3",
      "29": "d8d35a82-1a1e-4f2b-87c0-6a13a9566866",
      "30": "a202479f-bfe6-4143-a66a-f4dcd8a7fc10",
      "31": "230b29ec-5d77-4b80-a88c-e83ad88efdeb",
      "32": "b81194b4-811d-433a-a559-c76464815252",
      "33": "314a3b8a-ce87-45ac-86a6-95d48c606144",
      "34": "86036b19-58f4-4f14-a622-38efd6d7af33",
      "35": "1d6cf53c-8d7f-4e11-907e-43787907c980",
      "36": "8ae01801-25d2-4535-bc04-b435f82f9586",
      "37": "51828395-34a6-4a0a-bcc9-b3a5cfc4dfc8",
      "38": "902263c6-e7e7-4baf-ba14-64c5c9bee682",
      "39": "4617570e-b705-4caa-92f4-e79cbfbca48c",
      "40": "f9112e6f-d4db-4794-8632-a7e2a651b7f2",
      "41": "2e39d7a2-f119-4b91-b07b-4519a5e5bd78",
      "42": "7be3f0ad-1a2f-44ce-99c8-b477594b9a5a",
      "43": "cd0bfa59-0fb2-4409-8d6c-9438130de70e",
      "44": "9da33dfb-93e1-4211-b7ad-3d8f32be65f0",
      "45": "9a244efe-8a3d-4d2e-aee9-b23cc6f1c18a",
      "46": "03a40e92-f72a-4b2e-b38c-3ca5b3361aa5",
      "47": "c367b42a-08a0-4b18-8395-82863b1be602",
      "48": "326449e2-b6c7-4e5f-8254-baea28b92799",
      "49": "c5687f62-aa81-4de7-838d-b23d08848dd6",
      "50": "867a3932-b527-447d-8b05-b8e5e1dab686",
      "51": "56b49e8b-2fbb-49d3-8c05-82b9e915aade",
      "52": "d3336e83-8634-41a2-81cd-1f25cf6bf2a6",
      "53": "17b42f2c-0b54-43ae-9108-681df08c1acf",
      "54": "07483bfe-daba-48c8-ac14-9054072de317",
      "55": "05683641-5395-4afe-ae1e-f87b667e81a1",
      "56": "5e4d8b3a-a12a-46e1-9aae-21f201c6866e",
      "57": "0bc0b4b9-9972-4cd5-8f62-46f5c4058e62",
      "58": "89d01163-a286-49e7-992b-b0ed15060a1e",
      "59": "18d36e28-d2e0-40b4-9fdd-3b2073e6ae51",
      "60": "82c08b83-3f80-4ba5-b19f-b792820ec127",
      "61": "a4ce7a49-3332-4c20-b15c-3c8675b15f97",
      "62": "d021a864-3140-48bf-b35b-a48e2704e399",
      "63": "95a2754d-d61d-43b1-a2af-c36a0f13f60f",
      "64": "890f555f-c28d-46d1-bb18-6ae6cfd0eda5",
      "65": "e659efa2-7a60-4123-bd4d-c2900418fe33",
      "66": "1ffde7cd-5c63-4ccd-b6c5-936b10f5c886",
      "67": "652a02c3-7588-47f7-bc19-d80a5075a8a3",
      "68": "8fc480d6-f216-489c-8b73-5d0f2e0c074a",
      "69": "096734c3-d6db-4cb3-838a-7054c173298b",
      "70": "4ba31d64-a382-4bb7-abb6-dfc614848f20",
      "71": "9af66c60-85d2-403b-98fe-9f8eec01ab42",
      "72": "18490038-21ed-4b77-94eb-b328f5000858",
      "73": "ae20f311-cd48-4902-acaf-2af507fc2b49",
      "74": "6ee6754b-e957-4f11-8506-fff25476828b",
      "75": "c14bcef5-60de-4da2-b81d-3836cb5b3a3a",
      "76": "2ef7b9e2-0604-48cd-98d5-ba1f76e08084",
      "77": "92cea2c8-27af-4360-85e2-01e5721eb626",
      "78": "13700fdb-04e3-4245-a3e7-e105fd5669c1",
      "79": "620bac79-a3a7-4547-a8e5-88502ff3f4d7",
      "81": "1b6889b8-f1b1-4fce-9caf-f2101f167518",
      "82": "9b7a53f2-3991-41f1-b082-33cb0305a466",
      "83": "0b4e5e3e-50bf-4ece-a19d-c9d496e7b9f1",
      "84": "f92ac8df-0906-4946-84bb-67eb436966ca",
      "85": "1e33cbd1-54d1-44fe-a01e-c423a62b8f7f",
      "86": "fda83a01-11ce-49d7-b748-5e702ceeea75",
      "87": "7603d62d-52d7-4cb0-bf71-56e09cfae7f2",
      "88": "df640e93-b6f3-47a7-8760-f3756cb90ece",
      "89": "3aeba53f-d714-404e-add0-0505cffb027a",
      "91": "fb761f11-9be0-499b-aa15-5688a1451e76",
      "92": "6c43acd4-8e62-4a2b-9c09-492d8b57bfed",
      "93": "127acce1-033e-4133-a157-f0d6c41f73f6",
      "94": "908d4ac1-af76-47f1-a220-e28968d19ea0",
      "95": "aa8b0bb8-d2be-4b98-b194-23cea1d78b48",
      "96": "51d7bd9e-f12e-4d72-9362-5a813a21f907",
      "97": "399254e1-3c68-421e-b8c4-c9bbaec2120e",
      "98": "a5cea2a4-787b-42cd-abd9-265d0c5bec91",
      "100": "c2908859-9f29-4e0e-a37a-1be511c555d1",
      "101": "a2a34568-c114-4c67-b078-71370ef643ad",
      "102": "f7edbe4a-00fe-4e60-9eeb-e90441f3a590",
      "104": "b1ebb847-8d99-4723-bec2-5c090aad8656",
      "105": "36bb02e2-e4ae-478c-ab66-1197e6688065",
      "106": "a4718fb0-68c7-47bc-b1c0-72e0721223a5",
      "107": "3da1f2ae-b7c7-4c40-9f09-dea8605478e1",
      "108": "fa73985b-49ff-4dbe-8d0e-4ebd4039f939",
      "109": "ad5b3c1b-677e-4315-bae6-c3ebcef5950c",
      "110": "f0878961-e5f8-4fec-bc81-2a3241ed0843",
      "111": "d8230ef5-885a-49e2-9a44-3f36a4c12e1e",
      "112": "85a3b67d-af2c-4b36-a280-ae1c8a9e72dd",
      "113": "dc032315-9068-4371-8ced-20d9ed9ac4f5",
      "114": "5d66c6c2-b11c-4bf6-8610-fda9b40001e2",
      "115": "a6c5df44-569e-43bc-a5a0-fbb4c3f3baba",
      "116": "39c39662-7430-461c-ada9-2f251b58adac",
      "117": "e78705c6-de2e-489e-84d9-923134b6d411",
      "118": "bbef4292-4071-4ed0-9388-0e734abc47de",
      "119": "8a7dbf2f-ae8f-476f-85ec-ff96d7b940ff",
      "120": "6b02f3ce-7426-4ec0-9aae-b4d0190f8b5a",
      "121": "bdb0a9f1-bb7c-4f71-b3f6-f4ceda206486",
      "122": "96399dbe-17dd-4025-8def-b2f239a63c7d",
      "125": "2c28d937-9333-46fa-b228-ced91a31e1c9",
      "126": "0c5e7f75-4f51-41e3-a0bd-c757c002d9b7",
      "127": "c0052f0f-c614-4422-95d4-75dce3eb712d",
      "128": "49078d2f-4645-40c5-b095-a5aaa670a95f",
      "129": "5d82e23b-75c0-4492-b61f-2bd976550a1c",
      "130": "ab1c69aa-d0fa-41a5-a5e4-3d26c2eb187c",
      "131": "2e7c78cc-281e-483a-ac8c-71fccb699c5e",
      "132": "596bb15b-d4c2-4a73-bfa0-d4cf37b4aaf0",
      "133": "6f4cc60a-18b8-49ad-9e29-9f9680249d0d",
      "134": "ee7fb741-fbfa-421b-893c-7c8aef301397",
      "135": "c8b2e913-a5b9-4a84-9d96-5461bcffff80",
      "136": "879e2075-57fe-4699-9195-b98b695f21c0",
      "137": "ba84eba9-477e-4fde-aff7-1a16df6567e3",
      "138": "26e3cd3f-5f2d-469a-b29c-42889e4fee63",
      "139": "62525af0-8cc8-449c-a4b3-45aa4de3beb4",
      "140": "2f65679f-f2b2-43e5-a2ad-60e9a696865e",
      "141": "ae8e6e87-aa76-4641-bc52-60904671ba39",
      "142": "90384ae8-b2ad-4030-8c8a-ebf0ebd99b62",
      "143": "4fc7e3c4-5cf0-44d8-8df7-0ab556b54048",
      "144": "fe459bc4-e2bd-48e2-953f-4b7468d712ef",
      "145": "344ff7a6-75eb-4beb-813e-7e8401fb844c",
      "146": "5d4e6b94-556b-4405-af0e-1e9b8c30f136",
      "147": "5a9e2d14-c3e6-4f4a-8ccb-36b7da6ec863",
      "148": "52b181f2-62f3-4da8-a817-b506cadc9c91",
      "150": "c2ab3f2d-557d-4126-adcf-5b6a071e4cc2",
      "151": "380175e5-12af-4840-8eba-82a33311a336",
      "152": "af8c4991-a3b3-401e-a4a0-7a7a89776933",
      "154": "c0658bcb-5b2b-440e-80cb-9749fb44526b",
      "156": "90dcbeb8-fc4b-4f5c-b422-8232ad7aea3e",
      "158": "945ebe13-0b86-45b5-970a-3d36b6e0cd7e",
      "159": "dc5c6549-692b-4902-982b-42baf2972c79",
      "160": "0643fa51-8802-4a17-9d20-9bb7333aedc0",
      "161": "18050a52-ab40-46a0-8968-8b02178158ed",
      "162": "8f2f9657-b5b8-4b17-80c8-f237972ff8ac",
      "163": "e93f093c-1ae9-49ea-950d-de987dcc49cf",
      "164": "589db6ce-f1e4-441a-b0fe-4b2dbdb845d9",
      "165": "77e7d78d-a5b1-4515-8e44-22388f2d8ec1",
      "166": "3c0164e4-2511-4ea5-a7df-c4f3a2b3e86f",
      "169": "5d46163d-c514-4e34-8395-6ba3a6cba80d",
      "170": "7922ce55-b57a-45d2-adba-2d9a71ac2a97",
      "171": "7c7970c9-0892-47af-8818-d0bbb4b39929",
      "172": "092b3239-caf9-4a43-818b-cd3f30adc527",
      "174": "1919d160-5c26-4fac-9e98-058443672f17",
      "176": "f1624894-9147-4dec-8568-4a818d194950",
      "179": "709abfc0-febe-4e9a-8020-39a948242adb",
      "181": "1c74fcd7-d442-490c-af3c-873a3186de48",
      "182": "f48afd14-48e9-4050-bd79-dedbe0c3afa6",
      "183": "d192873e-c5df-485d-b8f5-57acc9bbd59a",
      "184": "099da2bf-4d67-4a2a-b68b-adbedfe2c594",
      "185": "0d409217-9de8-475e-b99e-ca3abef03251",
      "187": "aa9d633c-6ec7-41be-a342-f95b571f72d0",
      "188": "e8b65707-a194-4121-966d-30a8f6a7882c",
      "189": "cb56d03c-7aa8-4072-a001-1bddc102d78e",
      "190": "ebb3bc9f-d742-4845-9e00-4107d462d9e9",
      "191": "274e5019-6829-4b73-a6cb-f62623f7c529",
      "192": "b29f6ae0-09c5-4a52-9ac5-c079823b9884",
      "193": "11c181af-5e86-4a9b-9c81-de10f60bee37",
      "194": "5f7b3848-d83b-40bd-9d73-5ba472679b0f",
      "195": "883e37c4-003e-4a4c-abc8-056ebd3bcd53",
      "196": "c974a1d8-f03f-4b98-9d1e-d798123f1859",
      "197": "805cb6cc-54bb-43db-b3e7-4a293c841f46",
      "198": "df8e68bb-3417-4715-b055-8ad71b8978b2",
      "199": "c456023b-4eda-461b-9bbf-f70571bca98d",
      "200": "4682a5fe-3e0e-4e35-ab8d-55d50b0a5952",
      "201": "9dde6962-cc25-4166-a02d-eddc02a50402",
      "202": "28419f83-a889-4695-a4e4-1616d819a3e9",
      "203": "2c7b5d37-38e2-4157-a4bd-fa8fc8f92b42",
      "204": "ec620591-31f5-48a3-b706-cd335bb183dd",
      "205": "5dc529ae-7050-4cb8-bbe4-c96a09381e3e",
      "206": "8ce78bbe-e288-4909-b8d6-d4d28421ae63",
      "207": "83d1c1fb-c90c-4e13-970d-59e21e24b4bf",
      "208": "4f07ef88-9a00-46cf-a731-e6c39dd3d9dd",
      "314": "48d68b50-14e0-41f0-a588-b1fc92d2250b",
      "331": "4f36ebe5-c7ea-4591-8c37-a0ca81d3bdf8",
      "332": "2edbea76-1d8d-4c9e-be1e-088a7e41654e",
      "333": "7e227820-8ade-4b22-8dcb-b46cfe6f13df",
      "334": "9501d236-f71e-41f7-9f57-b9fdccc5540a",
      "377": "09eac983-eb0a-42bb-b866-e8efa1d7c957",
      "383": "086596eb-ecbd-41dd-ad0d-8ede4c73b2f7",
      "384": "523dd0e6-8601-4711-8ee2-792921ad714b",
      "385": "1976b0db-dcbe-4102-8a0a-7277435298cf",
      "408": "0ff2aab3-cd69-4686-a9b7-88609b591eac",
      "409": "5e1c8d5c-e97f-4a3d-94d7-e768daf07f02",
      "410": "0cb54cd3-fb0a-4c97-9cf8-40943a3416eb",
      "417": "07c24fc7-eceb-4a7a-8e75-2f87be0cafa7",
      "433": "a6987d6c-c1d3-4187-bdd8-6e72c84a99d2",
      "445": "af8bc80c-9918-4d47-97dc-7c4bc2b6e831",
      "450": "9b6aa62d-d3ec-42da-b366-f2bb1a39de7d",
      "451": "0a09344b-0119-446f-b068-3463cf9ac7f6",
      "485": "a2ae96f0-4166-41fc-9730-7d7af5f984f1",
      "486": "8a402f96-30ed-4a55-8c47-521eea05b6b1",
      "496": "a2a228d5-6435-417d-9092-43020fcb4373",
      "497": "5f17ee99-f3dd-4efa-9b8b-4ae4ddd0fc42",
      "499": "c1b077cf-f612-4c19-82e0-648ccf71f3b1",
      "507": "f9e3e640-d9f0-4c70-a0c5-ef5b13106f69",
      "508": "538fa336-8006-47b1-a783-aed06cff0fe6",
      "509": "c0f2cc12-ceb1-4d27-9010-a9cd0541fb6e",
      "521": "568fefcb-713d-47ac-be03-cd1a7bab9501",
      "523": "af9b9eca-2748-42e1-9554-41f2947f1fbc",
      "524": "7bc6e0f4-ff87-42e5-acda-426aa72bd66d",
      "536": "7354948a-4d53-43a3-89a2-6686c7aafde4",
      "538": "7b7e21bf-ade5-4218-a454-a314ced52ec5",
      "539": "4578c387-5b9b-44f1-9e92-614a8a32c0ae",
      "541": "d42c7ff4-5cf8-4f1c-954c-45e6fb4d6c75",
      "542": "37e1632d-1442-4641-bcd7-e327591c28ad",
      "545": "3cc4517e-dae1-40c9-9c9c-218130432be8",
      "546": "9a64cd30-b2b7-4439-848f-f47bd4813f84",
      "555": "ab223602-3119-44a9-8117-9380e376c4b4",
      "556": "a3baffca-3a69-430c-a45a-1f89be6ff795",
      "557": "be3e36d3-6798-4b93-85c4-4e789c76215c",
      "561": "9bf4ec99-87c6-42ab-b24f-bdc21cefd4f4",
      "614": "34ab270b-a889-43b6-a5d7-72baf7e1c2d7",
      "622": "013adf84-94f2-4674-974a-31ff2220fd3b",
      "623": "43a4925a-6496-4ac5-be3d-0eb310c1ad0e",
      "632": "a8111cf0-f29b-42d3-8d85-ce8cc1e926ed",
      "633": "cdfa5b6b-094a-42ac-b028-b7c73753ec35"
    };
    
    const stationUuid = stationMap[id] || id;
    
    // Map frontend modes to pub.emercit.ru API modes
    const modeMap = {
      'river_level': 'waterlevel',
      'precipitation': 'precipitationduo',
      'temperature': 'temperature',
      'humidity': 'humidity',
      'abs_pressure': 'pressure',
      'dew_point': 'dew_point',
      'wind': 'wind',
      'discharge': 'discharge',
      'waves': 'waves',
      'meds': 'radiation',
      'global_radiation': 'solar_radiation',
      'soil_humidity': 'soil_humidity',
      'soil_temperature': 'soil_temperature',
      'voltage': 'voltage',
      'tech_signal': 'tech_signal',
      'gas:2': 'chlorine',
      'gas:4': 'ammonia',
      'gas:7': 'hydrocarbons',
      'gas:8': 'co',
      'gas:9': 'so2',
      'gas:10': 'no2',
      'gas:11': 'no',
    };
    
    const apiMode = modeMap[mode] || mode;
    
    // Format dates for API (ISO with timezone)
    const dtime_from = `${a}T00:00:00+03:00`;
    const dtime_to = `${b}T23:59:59+03:00`;
    
    try {
      // Get fresh access token using refresh token
      const accessToken = await getAccessToken(env);
      
      // Call pub.emercit.ru API
      const apiUrl = `https://pub.emercit.ru/api/mchs/${apiMode}/${stationUuid}/?dtime_from=${encodeURIComponent(dtime_from)}&dtime_to=${encodeURIComponent(dtime_to)}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token might have expired due to clock skew, try refreshing once more
          const newAccessToken = await getAccessToken(env, true);
          const retryResponse = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            }
          });
          
          if (!retryResponse.ok) {
            const errText = await retryResponse.text();
            return new Response(`Upstream error: ${retryResponse.status} ${errText}`, { 
              status: 502,
              headers: getCorsHeaders()
            });
          }
          return convertJsonToCsv(await retryResponse.json(), mode, divider);
        }
        const errText = await response.text();
        return new Response(`Upstream error: ${response.status} ${errText}`, { 
          status: 502,
          headers: getCorsHeaders()
        });
      }
      
      const jsonData = await response.json();
      return convertJsonToCsv(jsonData, mode, divider);
      
    } catch (e) {
      return new Response(`Proxy error: ${e.message}`, { 
        status: 500,
        headers: getCorsHeaders()
      });
    }
  }
};

async function getAccessToken(env, forceRefresh = false) {
  // Refresh token for anon_pub user (stored as secret in Cloudflare Worker)
  const refreshToken = env.REFRESH_TOKEN || '';
  
  if (!refreshToken) {
    throw new Error('REFRESH_TOKEN not configured in Worker secrets');
  }
  
  // Cache access token for 30 seconds to avoid hammering refresh endpoint
  const cacheKey = 'access_token_cache';
  let cached = null;
  
  if (!forceRefresh && env.CACHE) {
    cached = await env.CACHE.get(cacheKey);
    if (cached) {
      const { token, expires } = JSON.parse(cached);
      if (Date.now() < expires) return token;
    }
  }
  
  // Refresh token
  const refreshResponse = await fetch('https://pub.emercit.ru/api/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  });
  
  if (!refreshResponse.ok) {
    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
  }
  
  const { access } = await refreshResponse.json();
  
  // Cache for 30 seconds (tokens live ~3 min but clock skew varies)
  if (env.CACHE) {
    await env.CACHE.put(cacheKey, JSON.stringify({
      token: access,
      expires: Date.now() + 30000
    }), { expirationTtl: 60 });
  }
  
  return access;
}

function convertJsonToCsv(jsonData, mode, divider) {
  // Extract values from the JSON response
  // Format: { "stationUuid": { "values": [{ "time": "...", "bs": 123.45, "zero": null }, ...] } }
  
  const stationData = Object.values(jsonData)[0];
  if (!stationData || !stationData.values) {
    // Return empty CSV with header
    return new Response(getCsvHeader(mode), {
      headers: getCorsHeaders()
    });
  }
  
  const values = stationData.values;
  const decimalSep = divider === '1' ? ',' : '.';
  let csv = getCsvHeader(mode);
  
  for (const row of values) {
    const time = row.time.replace('+03:00', '').replace('T', ' '); // Normalize timestamp
    const value = row.bs !== null && row.bs !== undefined ? row.bs : '';
    const valueStr = typeof value === 'number' ? value.toString().replace('.', decimalSep) : value;
    
    // For river_level, return two columns (sensor and BSV) for compatibility with frontend
    if (mode === 'river_level') {
      csv += `${time};${valueStr};${valueStr}\r\n`;
    } else {
      csv += `${time};${valueStr}\r\n`;
    }
  }
  
  return new Response(csv, {
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function getCsvHeader(mode) {
  const headers = {
    'river_level': 'Дата и время;Уровень воды (по датчику);Уровень воды (по БСВ)\r\n',
    'precipitation': 'Дата и время;Осадки\r\n',
    'temperature': 'Дата и время;Температура\r\n',
    'humidity': 'Дата и время;Влажность\r\n',
    'abs_pressure': 'Дата и время;Давление\r\n',
    'dew_point': 'Дата и время;Точка росы\r\n',
    'wind': 'Дата и время;Скорость ветра\r\n',
    'discharge': 'Дата и время;Расход воды\r\n',
    'waves': 'Дата и время;Высота волны\r\n',
    'meds': 'Дата и время;Радиация\r\n',
    'global_radiation': 'Дата и время;Солнечная радиация\r\n',
    'soil_humidity': 'Дата и время;Влажность почвы\r\n',
    'soil_temperature': 'Дата и время;Температура почвы\r\n',
    'voltage': 'Дата и время;Напряжение\r\n',
    'tech_signal': 'Дата и время;Дисперсия\r\n',
    'gas:2': 'Дата и время;Хлор\r\n',
    'gas:4': 'Дата и время;Аммиак\r\n',
    'gas:7': 'Дата и время;Углеводороды\r\n',
    'gas:8': 'Дата и время;CO\r\n',
    'gas:9': 'Дата и время;SO2\r\n',
    'gas:10': 'Дата и время;NO2\r\n',
    'gas:11': 'Дата и время;NO\r\n',
  };
  return headers[mode] || 'Дата и время;Значение\r\n';
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
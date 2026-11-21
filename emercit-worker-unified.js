export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    const id = params.get('id') || '203';
    const a = params.get('a');
    const b = params.get('b');
    const mode = params.get('mode') || 'river_level';
    const encoding = params.get('encoding') || '0';
    const divider = params.get('divider') || '0';
    const point = params.get('point') || '0';
    const api = params.get('api') || 'pub';  // 'pub' for pub.emercit.ru, 'old' for emercit.com
    
    if (!a || !b) {
      return new Response('Missing required params: a (start date) and b (end date)', { 
        status: 400,
        headers: getCorsHeaders()
      });
    }
    
    if (api === 'pub') {
      return handlePubApi(id, a, b, mode, encoding, divider, env);
    } else {
      return handleOldApi(id, a, b, mode, encoding, divider, point);
    }
  }
};

async function handlePubApi(id, a, b, mode, encoding, divider, env) {
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
  
  // Complete SENSOR_MAP for pub.emercit.ru (227 stations)
  // Only modes available in pub API: waterlevel, precipitationduo, precipitationduocomplex, temperature, humidity, pressure, wind, windgust
  const SENSOR_MAP = {
    "146": { "waterlevel": "31ee8910-7b87-408f-982b-9ad463f44826" },
    "11": { "waterlevel": "8418f017-08aa-4bc8-82c1-f325f8f83ca9", "precipitationduo": "265bc37a-97a4-444c-910d-44c1e0e9719f", "temperature": "cd9e3a20-4d8f-4999-8f2e-335fd29808f7", "humidity": "556ee64d-5fbb-4e2d-b4ce-8fbd3e832d8a", "pressure": "e0fccaf3-08b9-47c2-8556-660104207aa4" },
    "10": { "waterlevel": "9ba15f32-c2bb-421f-9210-4aa6f597acd4" },
    "12": { "waterlevel": "c81e1dee-971e-4663-916d-b7e6c26b49be" },
    "13": { "waterlevel": "3e668cc1-7744-4656-b0bd-223148b56729" },
    "14": { "waterlevel": "f0cd9604-4492-4d67-92ff-7586fed69e83" },
    "15": { "waterlevel": "1b176e01-0c67-4024-b816-48b2ac0993a2" },
    "16": { "waterlevel": "56cff62e-0be5-420f-9aac-49825a61ec4c", "precipitationduo": "191e43b4-e85d-4e1d-9f08-c9f27049c3f6", "temperature": "3d51c786-322c-4fc0-b672-26e7d299fc1e", "humidity": "020217be-e57e-4d3a-8b4f-3ea1a642f1e6", "pressure": "de30c378-0e55-4954-b54b-dc7a43305043" },
    "17": { "waterlevel": "cfd632e5-a5fa-44b7-8464-d48fb4b1449a" },
    "18": { "waterlevel": "91dde0e1-9275-4a89-9c37-8f97624231d9", "precipitationduo": "a2ff4013-f968-4f7c-80a6-1b3ea52a619f", "temperature": "27443d87-7705-4b3c-b7ee-17e2e29c56cd", "humidity": "ca53bd9f-ae99-4b51-9c19-799c04e17f98", "pressure": "404e8d6e-f707-43c0-9aa4-191cc53142ee" },
    "19": { "waterlevel": "eb1634f3-1109-4b85-9f21-6d390aad5695" },
    "20": { "waterlevel": "b5958808-bd0b-416a-88ff-36a44eb0cb5d", "precipitationduo": "4eff4d88-d250-4f8b-accc-1c0d1815e619", "temperature": "bf118d98-59eb-46e7-8e7c-2e8700157306", "humidity": "20548de3-e41f-4da7-baa5-5752bc4ece5c", "pressure": "f804ee38-4824-48bc-a030-b452c6dc1dfa" },
    "150": { "waterlevel": "19ad9477-d8ec-43fb-a907-8fa05994c4e9", "precipitationduo": "ba7ab794-962e-4d60-b8bc-076a958c8eed", "temperature": "53a2c93a-fe9d-49f4-a5d2-d14201db317b", "humidity": "b7e72382-71a9-43b9-ac65-3fe60668e342", "pressure": "4928dbfd-ae5e-439e-83ea-fb6eab5a5f32" },
    "21": { "waterlevel": "1d2a154b-37e3-4880-83d8-70bc4fc14c44" },
    "151": { "waterlevel": "5e724438-288b-421e-839c-40a8d625fde3", "precipitationduo": "430085df-7d9f-4bd9-8beb-f3c8156d7b02", "precipitationduocomplex": "8bd9df3d-bd7d-460b-b3b6-e6f175ac886a", "temperature": "5f034aef-f77a-45ea-80c0-3f85ae46a790", "humidity": "a710aefd-9c2d-4a4a-8435-a004f40357ff", "pressure": "6607ba67-1ba9-4475-932c-6eba60bf83a9" },
    "22": { "waterlevel": "bd3c8d79-d0a8-4bfb-b0a9-2cb000566c61", "precipitationduo": "d838a1a5-b933-4ff6-b142-df8dad2bb1e0", "temperature": "b4f03974-ef02-4b83-9f1d-f9cfabd1b9ad", "humidity": "c29016b7-8dd7-4512-b94a-484b6e4a3e34", "pressure": "c3e291dd-9486-4a3b-84d0-793bbf08d522" },
    "23": { "waterlevel": "7e974657-c32c-4196-9ebf-4278b083e109", "precipitationduo": "f6ab210d-f147-4272-9be0-0cec44cd52f9", "temperature": "9f1a926f-4e50-4002-80c4-287629cb216c", "humidity": "2290bd19-d3dd-418c-acbc-49869f9e5b4d", "pressure": "e585a91a-9db4-45fa-91ee-1991ada85c31" },
    "24": { "waterlevel": "0dd997cd-2aab-4e2e-95e2-ee11a142e6b9", "precipitationduo": "6855a73e-aa9e-472e-8b36-99d98cd69994", "temperature": "d206ec43-fc72-4ebe-a364-90d6df560f1e", "humidity": "1d067b9a-60f8-47a1-b4f1-607f53084ec5", "pressure": "dd360ba8-7e2e-4818-92df-596ed0b72ed8" },
    "182": { "waterlevel": "cb4c4e91-77e7-475b-8744-9aa359f5b2f2" },
    "25": { "waterlevel": "575813a2-4a6c-45ad-9e67-046c98dd8d57" },
    "561": { "waterlevel": "51d5b75c-9f98-473a-9dc4-4d0d6a29fdad" },
    "27": { "waterlevel": "c9918af1-4ac7-4edd-b6f6-625506b003df", "precipitationduo": "50c62284-b2d4-42bc-8c1f-ac7323ace058", "temperature": "cef0feb5-f616-451e-ac09-6d0045f96bca", "humidity": "4cd7b4a6-a3b7-4ffa-9a13-4f7a79cddf3d", "pressure": "0cc4ea3c-1002-4c11-a7c2-832f5bd9c4e0" },
    "28": { "waterlevel": "03d9e4be-be35-422c-bd86-163e2f53e0e0", "precipitationduo": "7a9ce055-3e92-4480-aeb3-0bef1f3f1025", "temperature": "e266c1b7-6959-4d2f-bcc4-ed84bcd83a1c", "humidity": "3d9ab953-0024-44f9-a4ba-1833cd012fa7", "pressure": "ffc9803c-30aa-43db-87ec-d3d1a0f7ae8c" },
    "29": { "waterlevel": "82a06c6a-8627-4e20-b299-f7613f3b656a", "precipitationduo": "c7b9a275-b851-4f64-bfe4-f58618265f41", "temperature": "c39c825b-3b03-4f67-8f32-ff12a92773d3", "humidity": "f5cb8422-51de-4a50-be77-2987ad34f3e9", "pressure": "69a7c033-79e7-41d9-a188-16781b1fe2df" },
    "148": { "waterlevel": "1dad0e1b-7b07-4cda-b948-eca93273463b" },
    "30": { "waterlevel": "eff5a9e0-55e7-4509-96ea-9e323efb33aa" },
    "31": { "waterlevel": "65968ac9-11a7-41a7-9c1a-eab43bd12b5d", "precipitationduo": "a49100b2-6fb7-4890-96fb-00787553f002", "temperature": "4e59a428-b825-483d-9c9a-1642bd051011", "humidity": "2b173406-9731-4114-b07f-1eca7233ca04", "pressure": "abb4b4ce-b076-4501-8258-baa99cbabc02" },
    "32": { "waterlevel": "85f26d38-e424-4b4e-b184-830a1a77a66a", "precipitationduo": "2b07dd91-9a55-4f30-8386-e066a3b2c71c", "precipitationduocomplex": "f066547b-5a04-47d4-b85a-30af11edf4bc", "temperature": "f6dc2d70-beaa-4547-be9d-aed20d33db62", "humidity": "99ec2c7f-a706-45d3-89c0-c071f5fceac8", "pressure": "6697e903-4db7-40b6-8e25-82fe02cfaf22" },
    "33": { "waterlevel": "4630fd63-7b69-4ea2-8dbe-fef744df3eed", "precipitationduo": "2d3b1851-e652-490e-b9f7-f5a3f0d418a7", "temperature": "3b377c71-48fe-42c2-96b2-c2158ddf79b5", "humidity": "62657b53-e125-4566-b85b-61955c1f5885", "pressure": "d807714e-fbb3-41bd-bd92-5f3cb6131875" },
    "34": { "waterlevel": "ff98f30c-6fb0-46dc-b660-05ea9b0649c1", "precipitationduo": "70332444-e5a5-4314-ad71-f153cfc124fb", "temperature": "e5683398-3a10-4a3e-ad8c-2ee0d7ebf61e", "humidity": "d1d0f985-807e-4a0b-9c82-7eb8bf6b01b4", "pressure": "246c4c89-b0d0-4058-a0a8-43803ed6944a" },
    "35": { "waterlevel": "ffacc250-a973-41a0-aabb-cbc82fc32aff", "precipitationduo": "e42afeca-7a48-4a13-819c-1097ffd8628e" },
    "183": { "waterlevel": "2ef547d7-b1c5-43bc-81a4-70581c78a37c" },
    "36": { "waterlevel": "503879b2-7cdc-41a8-b97c-930d7bf8fa8f", "precipitationduo": "935c690e-0f86-42a6-ab1f-bc771579d284", "temperature": "cf6bfe96-0569-43f1-b909-9e76369ce5fb", "humidity": "04a9e4d7-f720-4e03-9c5e-7e9b36c4b910", "pressure": "9cb80d85-5b87-4fca-b659-5f9f9e08bb98" },
    "37": { "waterlevel": "db84a00d-2878-48b0-a3a9-837e9cf46de7", "precipitationduo": "4fd12ea3-5c58-4fe2-8b55-bffaf75d4244", "precipitationduocomplex": "2bfe0ef9-9afe-4c1b-8f2b-28bd4daf6129" },
    "38": { "waterlevel": "87715be2-4700-4c22-9de9-aa3eeff851da", "precipitationduo": "5fd8bb62-cd55-40b8-9d74-5d7edf309bc8", "precipitationduocomplex": "2439910c-591b-46a6-9b32-6da09a26fd6e" },
    "39": { "waterlevel": "b5de0ed5-2c15-4bc2-8854-730370bac311", "precipitationduo": "a3453013-dae9-464f-b4db-dce545f97356", "precipitationduocomplex": "d3ff53da-2519-441b-8292-0fcbfa1dfed4", "temperature": "01d16601-e16b-46b2-8ca4-ab1d7934f91f", "humidity": "0d6fb67b-141a-4db3-ac3f-1be13a3aa760", "pressure": "194b7bf5-010d-4137-a627-b36c22e7a5b7" },
    "40": { "waterlevel": "b6a47517-5470-4d81-b105-0143946dd8d8", "precipitationduo": "6426fc33-2ad0-4482-aa2f-24cb4de7be87", "precipitationduocomplex": "39598d63-780a-46c8-945f-24259b6f8fd0", "temperature": "6297ae97-ea16-45c8-96dc-a97f7f199a31", "humidity": "74beb8b5-a186-42ac-8c9d-d1a774f1bad6", "pressure": "e9a24485-e40b-4528-b3f9-9314f7edadba" },
    "41": { "waterlevel": "190946a2-1f97-4c47-8a19-4795837d325c" },
    "42": { "waterlevel": "b7bace68-25a1-4cd5-b0af-1ebf23811278", "precipitationduo": "69d58715-5261-4d9a-9a06-f69376cc0436", "temperature": "55387fff-89cf-47f1-b377-5ab6c328c5da", "humidity": "773a8181-3732-4834-a460-200e6d6181f6", "pressure": "6bdbe2b6-2da0-4eb2-9126-7b80f76c6711" },
    "43": { "waterlevel": "b5a0edb0-e828-4510-a507-da2bb1ae359f", "precipitationduo": "149fa190-a414-4ea3-a902-31fcc275139a", "temperature": "8001f3af-2dd5-4671-80f8-12b63c307709", "humidity": "e1a29457-d7d6-440a-917a-f9d39c19198c", "pressure": "d5f41756-57fe-4bc2-ac61-8f699d866eeb" },
    "44": { "waterlevel": "30777615-522a-4de0-8881-ea60eadf41a7" },
    "184": { "waterlevel": "329aff9f-0473-44dd-8805-d8619c6ccc8a", "precipitationduo": "1229ab99-4d28-4471-a61b-c4e3d59998cf", "temperature": "8b5e50e8-ad7a-4fd0-b056-ebf0adae2014", "humidity": "dab3c797-4ab3-4ed9-877f-37d9c17ce79f", "pressure": "7031e4ca-ec9f-4618-a117-9420993f9793" },
    "185": { "waterlevel": "57412bdf-5819-4d0f-808d-97abd180c386", "precipitationduo": "5cee9a68-ff15-4d2d-888a-8e669b986e2c", "precipitationduocomplex": "b3342e22-c68d-49b7-a59c-05c7e366363e", "temperature": "fd2075c7-87f7-474f-acb4-eb2bf9f862f9", "humidity": "1c592009-9e76-4e86-86cf-e8945951a986", "pressure": "49fcbd6c-fa08-4742-b049-5e5643b817b7" },
    "45": { "waterlevel": "e1e1d9a3-f577-45d3-ab14-94b7579eda02" },
    "46": { "waterlevel": "36c1797b-153b-4e42-8c0e-a264e9cc088b", "precipitationduo": "6bdb898b-4232-4ec7-917d-9ea223ca0f5d", "temperature": "1ef20fc1-b79b-40dd-a524-f3c28809a901", "humidity": "68335809-c6b7-4985-beda-8408af5b6801", "pressure": "5ec47c8d-8b89-49d3-920f-a663c3eb3f14" },
    "161": { "waterlevel": "3b7b6658-b2d8-428a-8891-1cbf65d8470a" },
    "47": { "waterlevel": "1f0a5de9-be22-4a5f-831f-dd61f928013c", "precipitationduo": "e99fd40a-ad24-4c9a-a416-9a356183ac25", "temperature": "b98da9eb-09fd-411b-a19a-613eaaefb46c", "humidity": "d353e8bf-9b54-4037-8a39-4262ddd060be", "pressure": "e4deb999-6c2d-49dd-8e3a-14f8fbd8cddf" },
    "48": { "waterlevel": "b3798dae-975a-408f-8d55-9c8966e9d885", "precipitationduo": "362831a8-a88c-425d-b508-f5066ca41ae2", "temperature": "035fff9f-2147-4bf9-8ec5-15668af04003", "humidity": "0c174061-c521-4e3b-9e59-170dd0308b2b", "pressure": "c32e957b-0161-4a89-92c4-6469011c5030" },
    "49": { "waterlevel": "0e0d3fbb-5233-43fd-a41f-4722b55dec95", "precipitationduo": "c114dc7c-2765-4e99-be28-0b2b07cbe486", "precipitationduocomplex": "a8026372-6241-4e0a-870a-9adb032e7de2", "temperature": "af333c64-621a-4648-8c8e-a99f61049a92", "humidity": "fc921bb4-7016-4d86-bdb6-dfb347417a4e", "pressure": "f9c55b05-9d6e-4c36-940b-48e3764a8ab2" },
    "147": { "waterlevel": "d3abf2cc-8417-4d11-a0b5-ba49938cde0c" },
    "50": { "waterlevel": "f3e7ed63-5485-4cd1-834f-88b67cdadc2e", "precipitationduo": "1f083560-370c-431c-8b9c-53bdc37f29da", "temperature": "6d32d8ba-d430-441a-bd50-b6a933c0d123", "humidity": "46819e5e-2816-4bcd-a0b2-b43a7a8ac785", "pressure": "bdea5a78-dd96-4168-bea1-cce995e863af" },
    "51": { "waterlevel": "402fcc62-8a9c-4cc1-b55a-64fa176e5800" },
    "52": { "waterlevel": "941273c6-c26d-43da-a8a8-f210f736f617", "precipitationduo": "a3c90306-f7bf-4764-a812-a15c7d310731", "temperature": "33e41fd6-9687-4e54-a032-cb2bfdde9476", "humidity": "c4b5097a-8700-46ce-b7e4-acb95bdcc25b", "pressure": "f25bc7d3-c56d-4fb7-9071-03a5f615195d" },
    "53": { "waterlevel": "00524898-1cce-4e31-96f7-e0af6ebabda4" },
    "54": { "waterlevel": "c7a1e58c-e6e6-4fac-8b99-6877afde7aec", "precipitationduo": "e6faf1aa-70ba-4243-b883-207c62c9edd5", "precipitationduocomplex": "5b3ce8c5-5942-4970-8a6b-3e4dfc851e66", "temperature": "2b8016e6-d1cb-4353-b6c8-b5c15dad2c6a", "humidity": "839162df-8985-4eef-8cd8-5d00aaba11fc", "pressure": "8a2fc4f2-2f8a-433f-ba80-4c67a0116884" },
    "55": { "waterlevel": "e089ca7b-0b78-40b5-9cc9-e6146ba44090" },
    "56": { "waterlevel": "51415457-e576-41aa-85fb-62b13a5822c2" },
    "57": { "waterlevel": "fb77b0f9-31be-4615-8baa-793623d42f44", "precipitationduo": "2d98e22c-ca91-4b1d-9871-7d3c723925e9", "temperature": "e1f54aeb-0401-4eed-98d8-4ac17692a245", "humidity": "fdd6f41b-26c3-4bf6-a6cd-699496d48cdb", "pressure": "8ed1a87c-db7c-43b1-8382-b7de95c616ff" },
    "58": { "waterlevel": "595196cc-22fb-4549-b055-12cfa4cb1a3e", "precipitationduo": "7bf0c009-a036-4a75-b29a-2153d1f79b80", "temperature": "37614620-1ecb-4989-afa8-01189261f969", "humidity": "e79f7bf4-07a5-4915-a1ee-7abf1284d860", "pressure": "0ea9a9bf-cf9a-4744-877b-d8b53ebd4267" },
    "59": { "waterlevel": "49e2f570-c2a2-4b2d-bb6d-d579ce733f1e" },
    "60": { "waterlevel": "cf2e7494-b612-4855-bc3e-cda7dbddf655" },
    "623": { "waterlevel": "4140de34-7064-4cd6-86c3-03b000850f18", "precipitationduo": "644e3387-78f0-4292-9ff0-a7dc3286dddb", "precipitationduocomplex": "c47e4f8e-679f-44d8-a9ed-bc4664629ac3", "temperature": "9bc15265-2bd6-41bb-9788-bccc2ee7aeb0", "humidity": "79b71a45-da2f-4eb3-a5d2-0bed4a5883eb", "pressure": "34442a37-333e-43b3-bc21-bc815c52156f" },
    "61": { "waterlevel": "6b83088b-183c-46c6-836d-e9ac3ead36c8", "precipitationduo": "8e5e34e8-fbd5-4e39-a2f4-2804aaf6c6aa", "temperature": "943a19fd-0953-484b-81d5-73251cb9b8c1", "humidity": "11a385d8-dea4-4583-be3c-0d3608687f57", "pressure": "da7ff3cc-cddb-411f-aaeb-620392cef548" },
    "160": { "waterlevel": "3b8241de-7f65-49bf-aa68-0d8df5bd31af" },
    "62": { "waterlevel": "21e378f1-097e-4f8e-9404-8fb33b50675e", "precipitationduo": "fc26a114-9153-4133-9454-e5eaf88445a7", "precipitationduocomplex": "7d0f7ad6-6d9d-45a7-affa-6d34256b9656", "temperature": "77a8074b-718f-4d0f-bc38-cbc7d4531660", "humidity": "ff373c65-ce5d-4381-9b27-9cd493412806", "pressure": "0e7f2fea-c12a-4927-a02a-c84ccfd72762" },
    "63": { "waterlevel": "a8d53756-afec-46bc-adf9-fb97865a1e33" },
    "64": { "waterlevel": "4adb4220-3eaa-4f51-9999-58869942ee42", "precipitationduo": "75c12fdc-3d40-4b1b-92d5-735b0045afde", "precipitationduocomplex": "91986bfa-943a-4ad4-8b67-4b765f2029ed", "temperature": "b7e5f98f-45b5-447b-9d9b-32b817b6c708", "humidity": "ad743db1-7251-4a90-a36f-cf868a91cb00", "pressure": "154b253f-7f6b-4845-9c1c-e57b9d954aa6" },
    "65": { "waterlevel": "cee2424c-0752-4c8e-a2b0-f8169b5e1daf" },
    "66": { "waterlevel": "f4d283cc-1627-4b25-9156-06d9aa8eef68" },
    "67": { "waterlevel": "a88fc2a4-1a9a-473f-b096-6ea52eb4e47a" },
    "68": { "waterlevel": "792becbe-81cd-4db3-97ec-5e717c0dff2a", "precipitationduo": "45803148-702f-4473-ac64-4fb13bb05896", "precipitationduocomplex": "c53054bf-4580-4901-8cd3-5ff46c9190f4", "temperature": "abe57679-ec95-4dc1-ab43-25ae623be28a", "humidity": "bf91226b-7461-43b5-b7e9-e9a2d8ed8124", "pressure": "393d31ca-da97-4c5b-bf3b-47ef72cef332" },
    "187": { "waterlevel": "f0929d09-7484-49bf-88a1-136fcd39bb97" },
    "69": { "waterlevel": "d5c5bab5-f102-4aee-a5e9-2bf4705de0f1" },
    "70": { "waterlevel": "07b55002-3f02-473a-8550-0fa399202589", "precipitationduo": "38ef3130-7092-40a7-837f-05547af4773f", "temperature": "28c200f5-6218-42eb-aebb-2515d7b3e42d", "humidity": "1b9f8260-ba8f-4122-90fc-32f6c9172103", "pressure": "b5a966c6-8665-41d4-b342-2b40a9b71c82" },
    "71": { "waterlevel": "c029a0f9-9a40-481c-9661-8c52af18515a", "precipitationduo": "b4971648-411b-4956-931c-5c4ba199b44c", "temperature": "0b3c778a-5884-474a-9e2a-3ae9500ead75", "humidity": "e900d572-2b25-41ff-bf82-4ea9e63739a4", "pressure": "2e0e10ec-0c06-4a73-a6d3-01fb8ff4b32f" },
    "72": { "waterlevel": "fb05cb22-afb5-44f5-8728-f47707a8a0ae", "precipitationduo": "8514a50e-b05c-49ef-8aa8-6a812d4e39c4", "temperature": "53ca2d35-b1f0-4ce9-bd78-04791276a7e7", "humidity": "5e1a029b-e734-4668-a1ce-dc4fb58c6e94", "pressure": "782982f1-922e-4ddb-bbe8-720609cba609" },
    "73": { "waterlevel": "d098929b-fa9d-4cb7-a773-ea80709e1683", "precipitationduo": "001e251a-9413-451f-93d9-1a3532bafaaa", "temperature": "9d26f609-7653-4a93-a564-893c97c7750c", "humidity": "2e552197-f5df-438f-a950-f85518908d7e", "pressure": "8be044d9-0a17-4963-823f-eca0fd72753d" },
    "74": { "waterlevel": "81b86483-b8e5-4535-bbe2-5bc0f4f70e85" },
    "75": { "waterlevel": "874967ef-4d68-4571-adda-2bba8e0223e8", "precipitationduo": "52d029d3-ed32-41ab-8513-721b5f3b74a0", "temperature": "410170bc-7d21-4495-b49c-70c422f4edcf", "humidity": "f158736f-cbd5-415c-b677-9d090bcb6dba", "pressure": "d5675609-26ff-411d-b830-4059b8d15318" },
    "76": { "waterlevel": "2bdf3393-b43f-4db1-adee-4b72f03ca3b0" },
    "77": { "waterlevel": "138e5cfe-db7c-4de1-8f0e-ee84b8079808", "precipitationduo": "7a35cf6c-1897-488c-9444-ce951eb735b3", "temperature": "31b41022-067d-421f-996a-e47326817ea2", "humidity": "0a6dacac-75c8-45cb-b0bf-449c61b13225", "pressure": "b415af5d-b2b2-4071-86d0-871ad989cec0" },
    "78": { "waterlevel": "0e34ed2f-8931-4234-9d12-60329eead62b", "precipitationduo": "15c0d9ce-4b24-4e01-8aec-13d05ebb8baa", "temperature": "051a785f-b753-479b-9950-5a3e0ed211aa", "humidity": "d22ebef9-0286-4439-99ca-d73235be51ca", "pressure": "19ce54ff-4658-48a1-bc86-0c8256523277" },
    "79": { "waterlevel": "65868525-62a7-495f-b4a2-0b1d5440e939", "precipitationduo": "82e67a9e-e252-4cd6-aef9-74bcb6a222fd", "temperature": "ce220377-4105-4a23-ba2a-35d5da3bd573", "humidity": "38e314da-e5b7-485b-aa58-7dc3b641fd7b", "pressure": "cd192c8a-b51d-4439-bb09-c91719c0f6f3" },
    "384": { "waterlevel": "942c47db-b8f6-4c25-a826-17beff59b55c", "precipitationduo": "95c61a25-ca85-438c-97fa-2b57aae5d9d8", "temperature": "61c4da1b-0a7d-4467-906c-4f362dc8557f", "humidity": "825d6b14-acda-4835-b762-30e412bdfd0d", "pressure": "a6451853-e195-4f37-89e1-a6a851dccdf8" },
    "81": { "waterlevel": "425a1e58-f848-49e4-a69f-2e5d50983942" },
    "82": { "waterlevel": "35713c3a-4b70-49a5-8598-259eebf1a9ce", "precipitationduo": "116bf1d3-18db-425a-af01-4d1257aae738", "precipitationduocomplex": "111d4158-f38f-464e-97ff-d992e2515e63", "temperature": "8ffad3ef-a170-46e3-aaae-a83edc88a8cf", "humidity": "d1af3675-dc06-4373-98df-b87d383889fc", "pressure": "75292103-3eb5-48ec-a997-b4d9af5bc871" },
    "83": { "waterlevel": "f88ee9c7-b4bd-46e9-b2e6-3e4dc9df1d00", "precipitationduo": "68973540-c219-4355-ab77-0c64864ea6f0", "precipitationduocomplex": "98951853-47f4-41a1-a18f-866872037024", "temperature": "9ff483bf-329e-456a-b858-9613724d1847", "humidity": "7bf7b4de-6985-4249-bb2a-7bacef95a785", "pressure": "5bacc9bc-ca43-4f47-bdfa-31f4073e57e9" },
    "84": { "waterlevel": "3d9be351-3530-4868-a894-46feccb2fad8", "wind": "52d509f1-7595-4ec9-8e0f-235da9bbf53c", "windgust": "944b3a63-6995-4f5f-be24-e8534381bd46" },
    "85": { "waterlevel": "21587ed1-c34d-4db9-b47d-53ef55f19e63", "precipitationduo": "e498ed5d-221d-40e4-8449-010bbe0081da", "temperature": "1c7d78bf-c20b-416e-8fc5-d80a58324090", "humidity": "d63c451b-9f6e-4d53-92e9-871e26c97669", "pressure": "7ebfe3c0-9bc2-4d32-a722-c83896932729" },
    "188": { "waterlevel": "d32d012a-6fd6-4f98-96b9-2c3578109155" },
    "86": { "waterlevel": "f4f5540b-4725-4083-946a-e92f3424677d" },
    "87": { "waterlevel": "b1758528-6b92-42d3-ba83-536b1e5cda30" },
    "88": { "waterlevel": "feb15e71-4205-40c3-b102-1e707411ac15", "precipitationduo": "a395d121-f0a7-4fc1-82c6-c3e1adc9ec1d", "temperature": "5f6f89d2-a372-4223-9617-c0a4ec006e64", "humidity": "e1f8baa6-4782-4579-ae67-86345c13d70c", "pressure": "0bb830d0-a969-485b-83f5-20205f279a2a" },
    "89": { "waterlevel": "7f94770b-a20c-49bb-ab91-7edd43eb12f3", "precipitationduo": "5a157a21-d398-4126-887c-5d7b3e6a1d8e", "temperature": "e617cd04-1a67-4a15-ac28-32a5e0e98162", "humidity": "3168c3f2-8b16-4da5-93d0-5388f180510f", "pressure": "09df48df-d700-4d30-b387-d5575faadfc5" },
    "189": { "waterlevel": "91a37f95-fed6-4518-bf5c-ab6a68b92b69", "precipitationduo": "d1a0c61e-9314-46b2-8ac4-4ad7b5f9878b", "precipitationduocomplex": "701c6fb1-4fef-4989-994c-803d8850c2f6", "temperature": "481e8ce7-52f2-42d2-a890-4befae70c447", "humidity": "673d4dd6-e943-4fc0-b220-6144fe05f849", "pressure": "e12a2452-1ada-4c68-b698-6836b931fc96" },
    "158": { "waterlevel": "10fff842-2486-4b0b-89ce-37ad4344aad3" },
    "91": { "waterlevel": "e430a49a-067d-49b0-8aa2-c9f2fef2b003" },
    "92": { "waterlevel": "7ecf9b2a-f540-4a2b-9c8f-892dec4637e9", "precipitationduo": "65945588-0d28-4b83-8871-c10e1b866031", "temperature": "8e283eac-f9e7-406f-b0fc-6d46faa4dec2", "humidity": "d27a349d-dc9c-4c43-9c5e-5f57efeb0824", "pressure": "de9bd7ad-4e15-4ad5-938d-8c5111fb7d75" },
    "93": { "waterlevel": "6ecd20ad-2cc3-47e1-a2b8-ae0722a9a558", "wind": "52ff3a8e-9f9b-4e12-94fe-58b7d291c90c", "windgust": "df3d81ef-61e2-4bc2-9f24-cc8edb122560" },
    "94": { "waterlevel": "a504f32e-ba60-4209-a48c-fb05703b7d1e", "wind": "eb6815ea-9310-4f0b-a8fd-d38fae51a838", "windgust": "4ae8c8ef-c549-4635-a126-067fdba09171" },
    "95": { "waterlevel": "d525f7d4-c306-4aad-8daa-1998ffb5b156" },
    "96": { "waterlevel": "483e0a98-1228-44d9-82a9-e0bbb21ee89c", "precipitationduo": "9e1e14a1-1827-4188-9aa3-cc4c002434e3", "temperature": "5855a114-bc7c-412b-abbe-9c8f81d61410", "humidity": "fd79d1c6-ac24-4dfe-8951-09b347c35328", "pressure": "ee5ff363-412f-4c80-a01a-47bc259578d9" },
    "97": { "waterlevel": "7a3fa85b-607b-496b-9016-189a1779a44f" },
    "98": { "waterlevel": "bcc6bef3-e426-4183-9f36-dde0279ca130", "precipitationduo": "5d2ca754-71ee-454f-aaf9-380f7a2f5ca5", "temperature": "603e4a41-67f2-463e-a47e-231319c7caa4", "humidity": "d88114aa-d211-4dfc-9be8-8aac0a2a7dc3", "pressure": "1c41f0e6-35b5-4f16-ae28-d0e244f67545" },
    "632": { "waterlevel": "b0a3f8e6-1244-4e37-b621-d7d31836febe" },
    "100": { "waterlevel": "d3ed6a49-320e-486b-b327-1d77a8e3746d", "wind": "5d3606be-88a6-4567-b7d2-4a9c5f93979a", "windgust": "b30f90d4-65b6-4d95-93b8-9bd89ee1d5fe" },
    "101": { "waterlevel": "1b6016c8-2159-4e95-ab4a-c51a072c03c1" },
    "102": { "waterlevel": "e0efd9d2-bc0a-4cc3-959d-fc25ae089ab4", "precipitationduo": "fceab765-36cf-47f5-ad2a-e8bb3a4dacad", "temperature": "6f697662-679c-4838-a109-958368dc8ffe", "humidity": "f8219b7b-d8e8-4f81-a5e3-4f5a170eeeee", "pressure": "0546a6b2-5b75-4b49-8eb6-12219c9ec5d6" },
    "106": { "waterlevel": "01939bf4-890f-4ea7-9ffe-74b34cc5c2f2", "precipitationduo": "5b63c2d7-95ae-4bc1-a4b0-dbabaf9eba1e", "temperature": "12c018ac-9f0c-4bfe-b2df-5e762e9e4790", "humidity": "12c5f808-b789-43ef-bbda-1d824064107b", "pressure": "a8f5e96d-c8ed-4798-b302-2b837043634b" },
    "105": { "waterlevel": "4b95f3b0-2566-432b-a767-647a9d0ae2b4", "precipitationduo": "ebbe5fbc-f978-4fe2-9f3d-bd693ac185cf", "temperature": "42407510-a7a6-4c9c-a5e8-34e5d0604389", "humidity": "b448462d-2fec-4457-926d-3da4816b1cce", "pressure": "8abc26ca-fc56-4405-b739-464c67b06c09" },
    "104": { "waterlevel": "2ba52370-bc32-45e8-b471-be6d23c624a1" },
    "107": { "waterlevel": "0c736820-2d95-4082-8823-07d7cbdced56", "wind": "71e59320-8273-49bc-a42e-e2d62433a69b", "windgust": "cac92c4a-f87f-46d1-b421-93c236a44b48" },
    "108": { "waterlevel": "e67534d9-dcd2-4170-a5e7-5c717f0f9301", "wind": "c08d8bb9-3260-493f-bf3d-8c91b1f8d7e5", "windgust": "5c5c0ee7-5624-481a-8b4c-a1e2de7c0316" },
    "109": { "waterlevel": "4185ebfe-b42e-45b4-9916-63f3935843f3", "wind": "488333c1-61c4-44b5-aedb-9c774360ac99", "windgust": "4bdaf534-fa3f-4083-b5b3-3fa2e0f73e5a" },
    "110": { "waterlevel": "db8888c6-5524-4087-8906-0eaedd4c3f25", "precipitationduo": "4ab2d6ed-9ff6-4145-98fe-466d85f053a7", "temperature": "a518a036-a901-4265-9318-e386f7d04296", "humidity": "23635086-8a89-4044-8ac9-1f6e61b4675b", "pressure": "cffaf7ad-cd70-452d-811b-04463eb2d558" },
    "111": { "waterlevel": "c6335b3b-8b34-49e7-8a18-52c0cca35a88", "precipitationduo": "b213837b-b1ea-463b-a0c4-8cd8f47cf7a6", "temperature": "a1e5df97-5bfb-42a0-b389-ca76e9b205e2", "humidity": "3b847a45-7a98-43e2-a3f4-a31585700ea6", "pressure": "769f4816-b3e3-4728-abf2-88b6fef06cc4" },
    "112": { "waterlevel": "e6c3b77c-2627-4c63-a6a5-c909655d1d96" },
    "190": { "waterlevel": "0a783923-44b8-4638-8eee-3c93a8961c74", "precipitationduo": "a0851a63-7669-42b5-aea3-ac53ac86157b", "precipitationduocomplex": "3742cb97-548b-4e23-9134-2999ebe3a96a", "temperature": "88a46af1-7561-447e-a5af-1cd5216ade58", "humidity": "e4ad39e0-ac10-4e39-b07d-234adb342b6d", "pressure": "cb552f2c-3765-4b34-a2df-aae09158ffa1" },
    "113": { "waterlevel": "5a3427a4-8ec4-482b-989a-8608aa8f9c19", "precipitationduo": "88a479e2-983f-49c8-a941-75bd473d4e30", "temperature": "901cd437-6e15-4d27-bde1-22a9a137e71c", "humidity": "afa3b0b0-eaa3-4187-87c5-a637ef12e95c", "pressure": "52c0d3c8-339e-4992-b507-d6613ed1df0f" },
    "114": { "waterlevel": "7cdc18df-ffc9-40f3-8f9b-549a616ad374" },
    "115": { "waterlevel": "feabcd86-2bc8-410d-bb0d-c63914d81111" },
    "5": { "waterlevel": "e9222ff5-d191-4e8c-b3e4-e01b0ba61b9d" },
    "116": { "waterlevel": "122fdc53-e028-40d6-855f-80595422bb4e", "precipitationduo": "0e2e1dd9-83e4-4a70-97a1-11a7f0e80e4c", "temperature": "cb4392c6-1098-4da5-a81c-5c145b004dcf", "humidity": "0cc878f5-6a82-4680-99d2-cc05791520a6", "pressure": "6d114bbe-be0c-4456-8412-c268adedaaca" },
    "117": { "waterlevel": "1026fa88-c375-4b37-b4cd-ed6095aa4ca5" },
    "118": { "waterlevel": "2cfed7cf-06de-425e-9018-76a10edd1ea6" },
    "119": { "waterlevel": "715994a0-bea6-481e-85cf-d4d40deed6f4", "precipitationduo": "48a48f04-f6f4-404d-b429-87f64b54e713", "temperature": "d0091cfd-9d79-436b-8751-9095b8b49360", "humidity": "af3b823e-45bf-45a1-a884-933465e47e1d", "pressure": "2495bd1a-8a48-4a78-bde6-9df13dba6203" },
    "120": { "waterlevel": "19f97c35-a3a8-4c9c-aa30-d094d5b76ebe", "precipitationduo": "4c002e4c-c539-4d71-b1d1-be5a57bcb8d7", "temperature": "41f03661-ac16-4658-a30c-0bfa0a6ac793", "humidity": "091c2561-d9f7-4f1c-9733-b7eae384c812", "pressure": "5e4f2671-5e5c-495e-9152-8016af97d640" },
    "121": { "waterlevel": "d57e557f-13b5-4ca6-ba8b-a68ee1eb3a5c", "precipitationduo": "705aba27-a91c-459e-81cf-ea247cfd4ee8", "temperature": "6d6b0612-c43d-4159-91ab-a234f8400388", "humidity": "30373215-7284-414f-ab5e-3d454d7853ca", "pressure": "03f1560a-e608-4e6e-a05a-5c717f877954" },
    "122": { "waterlevel": "a77ead6f-29ff-467d-b27b-a99f275ead2a", "precipitationduo": "99fd5d06-99e5-40a5-8430-7e77b6a74b75", "temperature": "857a919a-9828-4cf5-80bd-5c8490be4b00", "humidity": "ee8ab88d-d4a5-464d-a032-aec64e1f724b", "pressure": "d46d1f58-4b40-44aa-a0e2-0bcdce4c87ef" },
    "614": { "waterlevel": "014bbb1d-55d3-4c83-a938-75719c836410" },
    "622": { "waterlevel": "418f7620-bfc1-4c3c-a8ad-fdf54b6d575e" },
    "125": { "waterlevel": "08398628-7885-4127-b78e-1b54fb06e779", "precipitationduo": "f324c579-0dfe-4d19-a26f-691aea4874bb", "temperature": "40715c4a-db2b-4143-8baa-e42f366f7fcd", "humidity": "de4a1acd-e9d6-4cce-ae5f-a10d5d64f9e1", "pressure": "4ee2f72d-97db-4a1d-aa14-bc2fb91a3e6a" },
    "126": { "waterlevel": "41e04a7a-3531-4c16-a16d-7c8345f87f88", "precipitationduo": "e94a5c20-1d9d-4ad4-ae23-0eac352ddd49", "temperature": "51929ffe-7a5d-43f7-9990-2f5922faabde", "humidity": "191b9b64-8351-4cd2-b626-b65633ae8af6", "pressure": "a428683d-e8f8-4312-ba48-288b533db1cf" },
    "191": { "waterlevel": "7e4cdc6d-e892-48d0-a5c2-2caf3655a396" },
    "127": { "waterlevel": "bb8268cb-ca00-4c7b-9420-29d2c5f9bc5d", "precipitationduo": "7e6a1549-a7d0-4376-bda2-43880f9bc2fb", "temperature": "dd7c2565-388a-48b8-9f20-596a285c8ab6", "humidity": "1daf3155-44f2-4232-9be6-75daae70805f", "pressure": "3d16eb6d-e06c-44c6-8322-694e4bde7bb7" },
    "128": { "waterlevel": "708c7764-5653-42c2-98a0-869ff92cc061", "precipitationduo": "ba576b8f-fb61-44c2-afcb-f82df0b5550b", "temperature": "1b117749-d389-4fa2-9695-132ee08f048a", "humidity": "1a4b4a61-f400-4634-9864-90bbdc72de37", "pressure": "95cd79b7-1fcf-434c-95f4-2e93727010df" },
    "192": { "waterlevel": "2e6bda57-40bf-4b91-866d-521757ae2246", "precipitationduo": "962c7e32-af29-4f73-a3f7-5cd06b91ae84", "precipitationduocomplex": "0ffa00cb-f979-41ff-98ec-9e39ffeec83a", "temperature": "92fb4dc2-0dbd-43ef-9142-cd2daf1afe4f", "humidity": "a7ba8428-9c87-48c0-8ca8-0f59cc9a47d6", "pressure": "cbf37fcd-fb8e-41a1-88c0-67c168f065b8" },
    "193": { "waterlevel": "53dee538-831b-447c-8866-19e24c6869aa" },
    "129": { "waterlevel": "9a710708-8b68-4f13-99f0-d45a1bef5a92", "precipitationduo": "fd6b2d9f-0f68-485f-b611-da2f4bc423c8", "precipitationduocomplex": "e08c37bb-5186-49a8-be5a-8d1b0fb236fc", "temperature": "041d0fba-7552-4118-b6b4-b84537a3e7b4", "humidity": "9f9a1da4-d265-4d29-8f2c-5715d5bd0a28", "pressure": "ee94734c-9afa-4253-9c9d-6b97387d8e21" },
    "130": { "waterlevel": "ba1ce4dd-17f1-4f4b-afc6-6f83023f158f", "precipitationduo": "4fdd108b-1a69-45d3-bf78-cccec8392615", "precipitationduocomplex": "a531b2bd-2900-484f-91dc-93f29c143d6d", "temperature": "003746d3-6961-4375-a20a-06737d6285df", "humidity": "e96e8db0-afc1-4ac4-9848-52f27fcbf5fe", "pressure": "a96e5613-a3e4-419d-a448-995866a6131d" },
    "131": { "waterlevel": "437094bc-7795-4505-a48f-9967148e6aa6", "precipitationduo": "e059d5b3-bcbc-4b67-9a1d-ba9677849279", "temperature": "c47a2344-d265-43dc-8de1-6bbd81a500aa", "humidity": "9cea501f-bef3-4155-95f2-fc9fd622a509", "pressure": "5f1f72b4-9bbe-4d19-8040-bb7c9063b752" },
    "132": { "waterlevel": "b2ebd26f-9109-4a6f-bc6b-5d9d0376c554", "precipitationduo": "3d076292-cca3-41c8-b558-343a058a672a", "temperature": "db7a79fb-460b-4554-9706-08a6b053448d", "humidity": "36300fa5-39a2-4526-a77d-fe421bcd6ecd", "pressure": "cf325177-0fa6-4d26-91f4-488d09a4c1b5" },
    "133": { "waterlevel": "9d397db2-3ab3-40be-9eb7-647717c644a6", "precipitationduo": "5dfe1e28-6062-4077-92b0-5563b100fbd7", "temperature": "5abf0c9b-6950-4e33-b79a-2cfad5548d83", "humidity": "37266c2f-319e-401d-9406-b8e93df3239d", "pressure": "665b7b9f-0344-4d2d-83c6-ae0122cb74b9" },
    "134": { "waterlevel": "38ddc7b7-87ab-498c-9b1c-ddd5968ecaed" },
    "154": { "waterlevel": "750c5984-e7d2-4862-b798-31a7affc5b12" },
    "194": { "waterlevel": "9ac2f574-4b62-42ad-86d6-c30986c85788" },
    "135": { "waterlevel": "db3fb019-3447-4d43-a360-bb2f488cc932" },
    "195": { "waterlevel": "ce214b8f-4b80-40ec-b9a7-3db96eeb415e", "precipitationduo": "f88af34e-f2ec-47a5-a0cf-5992d73e88b3", "precipitationduocomplex": "031eec92-4937-40a6-9d31-fcfaf0450d64", "temperature": "2ca63d7f-cee8-44f1-9110-d02930d835f3", "humidity": "69d7aca5-0a68-4b1d-8381-93bde8e8465f", "pressure": "4dc64aa8-eaf3-4996-a7a2-d0f21f2dbf3d" },
    "196": { "waterlevel": "bcff9129-cb71-436e-a469-0671aa4a17e0" },
    "136": { "waterlevel": "4d5702ef-d745-4ac6-bae6-103ee802b89c" },
    "197": { "waterlevel": "b71f86e7-2d40-476e-9571-112849f237bd" },
    "137": { "waterlevel": "d72f0599-4969-4de9-9467-b2c09a4465d5", "precipitationduo": "b71cd7c2-deea-4d55-9506-a36714d7580d", "precipitationduocomplex": "9293c6c2-2656-417a-b169-8e4ad04d9b4d" },
    "138": { "waterlevel": "10dfddf1-42e6-41d6-ab80-e9b5b8e641bb" },
    "139": { "waterlevel": "2bc37abf-134e-470e-8ba4-60decf29f991" },
    "140": { "waterlevel": "32c63fc3-3f65-45cb-accb-a8cd9700aac7" },
    "141": { "waterlevel": "a226434f-3abd-43dd-bd13-ddfb1d6d68cd" },
    "142": { "waterlevel": "1c45e56d-3355-42e6-8ce0-98628c1c40e5" },
    "159": { "waterlevel": "d0b64036-b46d-4045-a3db-141bf66a514b" },
    "156": { "waterlevel": "4990d6eb-1972-46f0-bef8-9c1202c72a7d" },
    "164": { "waterlevel": "f991aa5b-667b-4385-86b4-1b1c95da50f6" },
    "165": { "waterlevel": "b88f85bc-b3ce-4dee-b270-26b8edbe7f5d" },
    "198": { "waterlevel": "5372bea7-06b4-4a3d-9b23-321efad57be7", "precipitationduo": "4ea25fe8-ab9c-4bbf-8b0c-dbdde56369c4", "temperature": "47f15afb-1402-4da2-a69f-44f0a25f2c06", "humidity": "e8f4799a-8c57-46cb-a495-f33e0c4201a7", "pressure": "0b0cbd57-22a6-49e6-894e-26e8da9aac07" },
    "557": { "waterlevel": "dbfd5f63-e44b-46d6-89a8-4c8935e75ec5" },
    "199": { "waterlevel": "f36ccb52-5514-4808-8637-2df748d4fb55" },
    "200": { "waterlevel": "7f8c2523-2912-4d51-a40a-077d46d86e29" },
    "201": { "waterlevel": "d74d2e74-4b8b-47e1-9a26-31f94a9b61e0" },
    "202": { "waterlevel": "6072b274-d672-40c3-9e91-4f694107eca9" },
    "163": { "waterlevel": "65ed9cb3-b22c-4baf-ab67-408c2d64ba6d", "precipitationduo": "be24891a-23c5-4054-8ce3-3395b411076d", "precipitationduocomplex": "a9a755d5-b1a9-4e99-b84e-fe447d3fc20e" },
    "203": { "waterlevel": "9df8b5f8-0f1e-4631-bc8f-8f33a3d15b44", "precipitationduo": "72e7a26f-d1fe-42ef-82f6-dc71b9937db2", "precipitationduocomplex": "412553a1-0945-43e6-b10b-aec5cdb675c0", "temperature": "5c052d05-3671-476c-8015-3b0aef7d4f51", "humidity": "de249c86-2650-456a-a159-8fcf234d0a48", "pressure": "770cae99-a09f-4779-b5ed-4ede86d68cb0" },
    "171": { "waterlevel": "ae381fef-3eee-4a5c-8aad-3a9c7782ba8e", "precipitationduo": "98ec8b68-dd7d-4791-be91-f5eecc3f2988" },
    "204": { "waterlevel": "fd797e37-ff3f-40e1-aa25-da853d33265f", "precipitationduo": "be74fc91-4ee6-4875-942c-ebe453b3e78c", "precipitationduocomplex": "8a87fce2-854d-4b35-89ab-d57ceefe3b3a", "temperature": "b27c9e1d-a9a9-4c51-8b7a-445a1aeab14f", "humidity": "59f38afe-06fc-47fb-b60a-15044fbbafdb", "pressure": "ffff56a8-5068-4ab5-bb37-8b14070d8a3c" },
    "152": { "waterlevel": "6d0a83d1-f66f-408d-b66f-576b7dd5515c" },
    "205": { "waterlevel": "99d795d7-040a-4896-8ea7-c752bc91cb83" },
    "143": { "waterlevel": "3b0467df-be58-4cab-87ad-ea139271e24f" },
    "162": { "waterlevel": "f5af7264-c75a-4e90-9080-4a5bd9cfd6a4" },
    "176": { "waterlevel": "991ce9d1-a1ae-4ae2-8dda-9cc30981acd5", "precipitationduo": "ed10310c-bb35-46e6-b07f-028458f4438c", "precipitationduocomplex": "de7951da-3e4f-4759-b391-e00cc6a6574f", "temperature": "82c263e9-8be0-455d-b82d-a794c953f7e1", "humidity": "95b9ef4c-76b2-4895-9eca-d9cf957ab9f4", "pressure": "f67dd5d3-7d4c-481d-aa60-8a9e9f804a6a" },
    "206": { "waterlevel": "3b1faf2d-e3ad-4103-bd72-f75479dce7df" },
    "144": { "waterlevel": "a4579252-f672-4d06-b7ab-105747a1a517", "precipitationduo": "55464d04-a732-418c-b334-bbe535e83abe", "precipitationduocomplex": "21bdfd39-cf4b-4724-a225-880f8c069a25" },
    "172": { "waterlevel": "5be1d37b-fe15-4842-8826-2e12320ca6ff" },
    "207": { "waterlevel": "b54ac931-0973-441b-9dce-d5538e45dee0" },
    "181": { "waterlevel": "fa475eaf-bd13-4fc3-99a3-c86252b593d6", "precipitationduo": "2ef219b0-44c5-4b4c-975b-8931b199fe4d", "precipitationduocomplex": "92f517b4-04e3-4f87-8353-62d9d5086bab" },
    "208": { "waterlevel": "0e7d9734-a3e7-4e81-a4f1-c5d466d5c588" },
    "174": { "waterlevel": "58f61431-f234-41e9-a70b-4640d6c66b6f", "precipitationduo": "49045b45-0276-4e0e-a6fa-8754ceabb71e" },
    "166": { "waterlevel": "c1ae5373-e8df-4f46-bcae-f63e15282118" },
    "145": { "waterlevel": "9afabc4a-7426-4061-8dba-437be1937919" },
    "169": { "waterlevel": "72e670c8-bf0c-4ca8-9a55-195301390659" },
    "179": { "waterlevel": "0264bd6a-25e1-49fc-af94-047c7fa73928" },
    "377": { "waterlevel": "096c96f1-aec4-41cb-b117-03c78eaf2093" },
    "383": { "waterlevel": "c309979d-fb4b-4860-baf1-c88c1eef8563" },
    "385": { "waterlevel": "b8309675-e340-4751-8b04-1c12d8b7aa05" },
    "417": { "waterlevel": "94e61c6a-a7a7-474a-b13a-94ecf7e56265", "temperature": "0fb6958c-30d3-490d-98f2-e5867e09a642" },
    "433": { "waterlevel": "bcb20344-f090-401e-a7c6-3556ac05f819" },
    "445": { "waterlevel": "c514d4e2-9e2a-42a6-98d8-daf679fecd2a" },
    "450": { "waterlevel": "c9ce1a54-3086-423d-8210-bb7947e09731" },
    "451": { "waterlevel": "3b4dad59-ae9c-4c9d-a411-3bb4ee3f8abf" },
    "485": { "waterlevel": "fde2bb4a-0d49-4dbe-b100-8ac6d6b271cd" },
    "486": { "waterlevel": "66ece7cc-761f-4711-abd5-801264eff498" },
    "496": { "waterlevel": "43774ec2-1fbb-42cf-8ec0-b6b8855b1723" },
    "314": { "waterlevel": "116b4422-b64d-403a-a5b6-3167d7991412", "precipitationduo": "8095b1bb-a341-41b5-8836-7d5ae766d8dd", "temperature": "adada0b5-9dfa-4637-989b-d0f1918202dd", "humidity": "68dfca2e-f33b-4b16-82ed-e4ad8770c233", "pressure": "e822db64-feeb-46bd-9167-4ca02ca3336e" },
    "499": { "waterlevel": "311147b0-c0af-4b2a-9b91-738fddb89bd6" },
    "331": { "waterlevel": "9876faa5-9d89-452e-945c-dcc8becf10cd" },
    "332": { "waterlevel": "dfbc5990-c81d-4c4e-ae65-f69065a43baa" },
    "333": { "waterlevel": "299c34c6-cc29-4ba3-9877-178ea2b3fc1e" },
    "334": { "waterlevel": "85cacefb-3d86-4a88-9242-14b3e45f89df" },
    "408": { "waterlevel": "50faab44-0628-4df3-9f9b-14a7ba334fc2" },
    "409": { "waterlevel": "5442be47-dab0-4028-91b2-87c71d9ecaae" },
    "410": { "waterlevel": "f3b86c4c-c3c1-4b9e-afce-961248dffe45" },
    "497": { "waterlevel": "7bc687de-9bf9-4d80-8104-2770c390c857" },
    "507": { "waterlevel": "f62e814e-4c48-403b-9bf9-b5d3ea1cdfda" },
    "508": { "waterlevel": "8956f3e1-875f-4ed2-b5f9-ca6cd5d615b2" },
    "509": { "waterlevel": "05a0ace4-7410-4f0e-b1b5-a74d02dbd2fb", "temperature": "9beebea3-a96c-49fb-a6dd-0226fcc1692f" },
    "521": { "waterlevel": "525f7ffa-232c-4ac0-90b1-ce68b959e630" },
    "523": { "waterlevel": "3765c889-595b-43a7-95d9-6fab2374c801", "precipitationduo": "a0be6850-e6e1-442c-8110-f9822397124a" },
    "524": { "waterlevel": "4cfba5e2-382b-4635-a330-2704988aff66" },
    "536": { "waterlevel": "0e8e039b-823b-44e4-b7be-cb051ddc5bd6" },
    "538": { "waterlevel": "6ed91641-b3d9-4f4e-93f6-3f3902caad1c", "precipitationduo": "9c3f18bd-a6d8-4932-bcec-b55143c4dda1", "temperature": "8ad36410-b76e-4d39-9dba-a81b430b36b7", "humidity": "075a5458-7c3b-4ec1-9629-dfe8b8200b85", "pressure": "9910ebcc-aa8d-466c-93e9-fe4542c4b60f", "wind": "4dfee307-78aa-49bc-bf2f-8ecea6e2a579", "windgust": "fdc57007-115e-4243-96e9-e4dd544a9a24" },
    "633": { "waterlevel": "68df88fe-1511-4f47-817f-a38106d59009", "precipitationduo": "fe74aa13-9b50-44ec-9de5-07c3d7b66344", "temperature": "45a4edc7-842e-44d6-8804-8842edb27766", "humidity": "a5fe02fd-ef0e-4582-a890-fcde6ecccfb6", "pressure": "a3f99b9f-2ee0-41ff-ac6f-30f230a68b2b", "wind": "cfa180f5-7c0e-4894-981d-aad5789040b1", "windgust": "869697bd-f0ce-4b09-9652-fad9143d249d" },
    "541": { "waterlevel": "5c1d60f5-79ef-49c9-84f5-dc625d05727d" },
    "539": { "waterlevel": "8c6be259-f074-429f-9f42-2c1871d18952" },
    "542": { "waterlevel": "6663481f-bc99-4a94-8135-61047aeadaad" },
    "545": { "waterlevel": "62cd1439-f8a0-4a22-a6f0-0f51111ad081" },
    "546": { "waterlevel": "1a396b53-973e-4f46-b3c5-65a3de6c4a8f" },
    "555": { "waterlevel": "7c5308f8-3753-469b-890c-c162b18d496b" },
    "556": { "waterlevel": "479100a4-36eb-4f5c-a4c8-526afce8548f" }
  };
  
  const stationSensors = SENSOR_MAP[id];
  if (!stationSensors || !stationSensors[apiMode]) {
    return new Response(`Station ${id} does not support mode ${mode} (API mode: ${apiMode})`, { 
      status: 404,
      headers: getCorsHeaders()
    });
  }
  const sensorUuid = stationSensors[apiMode];
  
  const dtime_from = `${a}T00:00:00+03:00`;
  const dtime_to = `${b}T23:59:59+03:00`;
  
  try {
    const accessToken = await getAccessToken(env);
    
    const apiUrl = `https://pub.emercit.ru/api/mchs/${apiMode}/${sensorUuid}/?dtime_from=${encodeURIComponent(dtime_from)}&dtime_to=${encodeURIComponent(dtime_to)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
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

async function handleOldApi(id, a, b, mode, encoding, divider, point) {
  const nocache = params.get('nocache') || Date.now();
  const targetUrl = `http://emercit.com/map/csv.php?id=${id}&a=${a}&b=${b}&mode=${mode}&encoding=0&divider=0&point=0&nocache=${nocache}`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ru;q=0.6',
    'Referer': 'http://emercit.com/map/',
  };
  
  try {
    const response = await fetch(targetUrl, { headers });
    const text = await response.text();
    
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300',
      }
    });
  } catch (e) {
    return new Response('Upstream error: ' + e.message, { status: 502 });
  }
}

async function getAccessToken(env, forceRefresh = false) {
  const refreshToken = env.REFRESH_TOKEN || '';
  
  if (!refreshToken) {
    throw new Error('REFRESH_TOKEN not configured in Worker secrets');
  }
  
  const cacheKey = 'access_token_cache';
  let cached = null;
  
  if (!forceRefresh && env.CACHE) {
    cached = await env.CACHE.get(cacheKey);
    if (cached) {
      const { token, expires } = JSON.parse(cached);
      if (Date.now() < expires) return token;
    }
  }
  
  const refreshResponse = await fetch('https://pub.emercit.ru/api/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  });
  
  if (!refreshResponse.ok) {
    throw new Error(`Token refresh failed: ${refreshResponse.status}`);
  }
  
  const { access } = await refreshResponse.json();
  
  if (env.CACHE) {
    await env.CACHE.put(cacheKey, JSON.stringify({
      token: access,
      expires: Date.now() + 30000
    }), { expirationTtl: 60 });
  }
  
  return access;
}

function convertJsonToCsv(jsonData, mode, divider) {
  const stationData = Object.values(jsonData)[0];
  if (!stationData || !stationData.values) {
    return new Response(getCsvHeader(mode), {
      headers: getCorsHeaders()
    });
  }
  
  const values = stationData.values;
  const decimalSep = divider === '1' ? ',' : '.';
  let csv = getCsvHeader(mode);
  
  for (const row of values) {
    const time = row.time.replace('+03:00', '').replace('T', ' ');
    const value = row.bs !== null && row.bs !== undefined ? row.bs : '';
    const valueStr = typeof value === 'number' ? value.toString().replace('.', decimalSep) : value;
    
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
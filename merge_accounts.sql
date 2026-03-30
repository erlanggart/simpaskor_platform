-- ============================================
-- MERGE DUPLICATE ACCOUNTS SCRIPT
-- Strategy: Keep account with cleaner email, transfer all data
-- ============================================
BEGIN;

-- Create function to merge two users
CREATE OR REPLACE FUNCTION merge_users(keep_id UUID, remove_id UUID) RETURNS VOID AS $fn$
BEGIN
  -- Update evaluations (jury_id)
  UPDATE evaluations SET jury_id = keep_id WHERE jury_id = remove_id
    AND NOT EXISTS (SELECT 1 FROM evaluations e2 WHERE e2.jury_id = keep_id AND e2.participant_id = evaluations.participant_id AND e2.event_id = evaluations.event_id);
  DELETE FROM evaluations WHERE jury_id = remove_id;

  -- Update event_comments
  UPDATE event_comments SET user_id = keep_id WHERE user_id = remove_id;

  -- Update event_coupons
  UPDATE event_coupons SET created_by_admin_id = keep_id WHERE created_by_admin_id = remove_id;
  UPDATE event_coupons SET used_by_id = keep_id WHERE used_by_id = remove_id;

  -- Update event_likes
  UPDATE event_likes SET user_id = keep_id WHERE user_id = remove_id
    AND NOT EXISTS (SELECT 1 FROM event_likes el2 WHERE el2.user_id = keep_id AND el2.event_id = event_likes.event_id);
  DELETE FROM event_likes WHERE user_id = remove_id;

  -- Update event_participations
  UPDATE event_participations SET user_id = keep_id WHERE user_id = remove_id
    AND NOT EXISTS (SELECT 1 FROM event_participations ep2 WHERE ep2.user_id = keep_id AND ep2.event_id = event_participations.event_id);
  DELETE FROM participation_groups WHERE participation_id IN (SELECT id FROM event_participations WHERE user_id = remove_id);
  DELETE FROM event_participations WHERE user_id = remove_id;

  -- Update events (created_by_id)
  UPDATE events SET created_by_id = keep_id WHERE created_by_id = remove_id;

  -- Update jury_event_assignments
  UPDATE jury_event_assignments SET jury_id = keep_id WHERE jury_id = remove_id
    AND NOT EXISTS (SELECT 1 FROM jury_event_assignments j2 WHERE j2.jury_id = keep_id AND j2.event_id = jury_event_assignments.event_id);
  DELETE FROM jury_event_assignments WHERE jury_id = remove_id;

  -- Update material_evaluations
  UPDATE material_evaluations SET jury_id = keep_id WHERE jury_id = remove_id;

  -- Update orders
  UPDATE orders SET user_id = keep_id WHERE user_id = remove_id;

  -- Update ticket_purchases
  UPDATE ticket_purchases SET user_id = keep_id WHERE user_id = remove_id;

  -- Delete user_profiles
  DELETE FROM user_profiles WHERE user_id = remove_id;

  -- Delete user_sessions
  DELETE FROM user_sessions WHERE user_id = remove_id;

  -- Update extra_nilai
  UPDATE extra_nilai SET participant_id = keep_id WHERE participant_id = remove_id
    AND NOT EXISTS (SELECT 1 FROM extra_nilai en2 WHERE en2.participant_id = keep_id AND en2.event_id = extra_nilai.event_id AND en2.type = extra_nilai.type);
  DELETE FROM extra_nilai WHERE participant_id = remove_id;
  UPDATE extra_nilai SET created_by_id = keep_id WHERE created_by_id = remove_id;

  -- Delete registration_payments  
  DELETE FROM registration_payments WHERE user_id = remove_id;

  -- Delete the duplicate user
  DELETE FROM users WHERE id = remove_id;
END;
$fn$ LANGUAGE plpgsql;

-- ============================================
-- JURI EXACT DUPLICATES
-- ============================================
SELECT merge_users('bbf25166-c6f2-496d-bb52-09a910b1d6fe', '2161ca07-b1c0-48d1-a311-f53c750f99e0');
SELECT merge_users('f28d8669-9d6e-4476-b081-153ace4442b4', '40aacc9f-665a-40a7-ab43-5d0ee92be95c');
SELECT merge_users('9619275e-a8d2-4de9-993c-51a261361f09', '79a551ee-3e27-4b65-8aac-30ddb65b7062');
SELECT merge_users('9b80832b-1776-44f0-868a-15f0e705c544', 'c90e479d-0b43-4935-8b94-45680c49038d');
SELECT merge_users('59b7f38b-fec1-4aa9-9390-5a752b7015df', '8f9e688f-24c8-491d-b04c-662af2713c1a');
SELECT merge_users('53a34110-2a16-4bfa-91d4-95018537ea66', '59e689ae-8420-4fab-a2e3-66dddffa0e50');
SELECT merge_users('8d8f81f4-bd97-46d5-bda0-06a8a3507670', 'eb99e401-3633-403b-a6c8-e143b2fd5ffa');
SELECT merge_users('9baebd44-90ef-4202-a944-f6e2f55b5f55', 'c74a5e7d-492d-4277-99d1-37a51bde752c');
SELECT merge_users('51273c96-ae91-481c-a880-99c52361df1f', 'aa56dfae-f889-4029-90e3-5e4e21c6244e');
SELECT merge_users('942bd247-1a54-4ba4-9262-39718155ea22', 'dfc83e13-a208-4458-af3f-c3b70ac14fa2');
SELECT merge_users('da4594a1-5080-4f88-90e2-05ba932ab2c7', '317159c2-5d15-4ab5-86cf-ab908203c280');
SELECT merge_users('de31ebbf-2ff5-463c-801a-6c64ff158be8', '03b9b8ae-dad9-4e9a-a6f9-3bf7fe67ed10');
SELECT merge_users('0afa81da-d07b-45de-b56f-58d5e7c81957', '81eaca77-de83-4b91-a7f8-844f3060cc4e');
SELECT merge_users('98b4bb5f-f90d-4bd2-bc06-7400b0fab03c', '718466fe-4f97-46a7-8698-b70a41541c8c');
SELECT merge_users('dc2bdaae-12af-4a5b-8290-f2a26d465d09', '30d6b1cc-862f-46e5-b661-9bf39124fc7e');
SELECT merge_users('41c8d5dc-bea2-4e57-80a8-a4d4801fd1d2', '98757207-384d-4923-b198-a9618e48ff0d');
SELECT merge_users('2b87a729-444e-4693-b6d5-c72cfb0a4763', 'f4614e24-97aa-4f56-9823-3b55bc7ee475');
SELECT merge_users('8b1a2cd3-71aa-4a68-8907-c6152d650bca', '4a3eb851-fd8f-4958-9353-496d9c5c771c');
SELECT merge_users('a7009c2d-184f-4892-ae57-40d10e31deec', '6efc93c3-9639-4018-9b46-adcf3f2946af');
SELECT merge_users('fc017a68-8139-496f-9d76-1117a933220d', '81223579-f606-4c21-84af-2f992c86e393');
SELECT merge_users('8468350b-0b3f-4a03-b6ad-b9c4ded217c1', '12be8c9c-561e-4208-bea3-a3b5369a7e95');
SELECT merge_users('8efd2936-cb05-4c47-9954-a229dc564a83', 'fccec571-900a-4ec1-a094-719320203540');
SELECT merge_users('bab0b5e2-c01b-4402-8109-ec4752514d41', '7447c4c3-15b1-4676-9bb1-1299bdb67f56');
SELECT merge_users('67279be3-b8cd-4a26-9b5d-3b3f4bd1c923', '9ee173eb-7e3b-4866-b12d-e3b5b5a85a20');
SELECT merge_users('369edbc6-e5d9-42e9-a3cd-0edaabe742c2', '6263cbd6-9f6d-45d7-82b0-9ff979e0b202');
SELECT merge_users('bca7f39f-c5ce-43c3-ab8b-844b256a559b', '17cd25b6-cb9b-44c1-99a9-bbcd4677ddda');
SELECT merge_users('bca7f39f-c5ce-43c3-ab8b-844b256a559b', '3b80ac6b-dc12-410f-a27d-2ed7af55b424');
SELECT merge_users('556807f2-b091-4b2a-8d79-bc68960fb494', '3870737a-58d0-47b7-baee-fb115d783ab5');
SELECT merge_users('053ea6a1-2674-4a5d-ac1f-024d5dde8fab', '9815c982-4f25-4d78-a364-3aa7e700cfab');
SELECT merge_users('b233f895-184d-4298-8081-3c922e07c952', '7bcd09bb-7064-4679-9a15-9dbd8497cacb');
SELECT merge_users('0b964d62-f828-4143-8ac3-aea1c076a560', '0155ed21-b117-4274-97a0-0cda071f76f5');
SELECT merge_users('5a7dd404-3758-4392-b910-413fa31d2261', 'af135df1-fbd8-4888-bc89-9d51876b9336');
SELECT merge_users('c2eb66ee-bd93-4e50-bdf0-02d40f618967', '4a1cfc03-6f77-43f6-9178-ed6890fe3ad2');
SELECT merge_users('8b30c5fc-642b-4cf8-ad53-39161cd5d461', '50c3567a-1edc-450e-bb80-ce5ab0f76f14');
SELECT merge_users('b6616d20-61aa-4a9d-8640-376e2b52e06f', '5097eda3-5a76-4a86-9f11-e391cfef29c0');
SELECT merge_users('4fee9e41-71be-4761-9c3e-25d3fd17d65f', '809a57f5-d616-4567-82d4-5c8bb0c0ae04');
SELECT merge_users('c3e8f720-7623-48ca-bc8a-ae867ea5b3fa', '2fe951bf-6386-4635-8380-857ee5089ff8');
SELECT merge_users('c4f12d8f-475b-4339-b1f0-b4db8f5c1407', 'e3e61dd7-d7ee-4319-a072-439784047e7f');
SELECT merge_users('f0615ed1-e263-45e0-852e-a6d3f95bea19', '26cdd3ed-e519-4a6e-b0c6-a90e650bbcb2');
SELECT merge_users('eb70db26-8ed6-40c7-9c19-99e23a948910', '438c42e3-1537-4fa7-8c88-7b11292fd259');
SELECT merge_users('d992870f-5f26-41a3-839a-020615477b52', '3a69a3e1-b7d8-4ffd-947b-fcaf8d4b5eb7');
SELECT merge_users('b17151ec-265e-4411-b326-ee2907c5dd79', 'ed206c0f-cca1-425c-bd43-99b321bdff73');
SELECT merge_users('c0dc9daf-4cad-4696-a2f8-367465dbd260', 'e9ccdf69-c110-4d66-a82b-6b6c4dc17c94');
SELECT merge_users('1b2b4bf7-7153-406e-bf63-fc518389ffbd', 'cdaedf19-53de-4c32-98ce-06e5d62d39bc');
SELECT merge_users('1c02f3a7-c358-48fe-903d-86d3b2d965b0', '35ab233f-3e86-4af6-92f6-4a89c7301797');
SELECT merge_users('24bc06dd-150f-419e-baad-81e22eea8c63', 'fc71e2a8-81ae-4817-a2b7-a0b375cf366c');
SELECT merge_users('4168133a-3db8-4402-852b-121e8409976f', '0c15cca2-3fa7-40dc-bd94-a4240ff307c8');
SELECT merge_users('4168133a-3db8-4402-852b-121e8409976f', '09799e5b-561c-4fc4-b2e5-51d9bd3f2154');
SELECT merge_users('c77116ee-9129-415b-9f60-06febcd33967', 'eb337695-931f-445a-aaaa-6ed84fcd1db6');
SELECT merge_users('d1c26f79-bf0a-47f0-8d4f-cd29e3130457', '4809ab46-f5eb-4020-9dfa-3ac06a412161');
SELECT merge_users('4824b25d-ca10-4fc0-bdf1-2e2581c7a2a0', 'dc9da397-b603-4884-b9c3-42d09454a57e');
SELECT merge_users('86165320-3a1a-4cdd-b725-fa6d00f949ae', '6da15fa0-c817-43eb-b6b0-92642039ac72');
SELECT merge_users('07b9b4f0-53fc-43cc-b796-2307f7651c9a', '6f64c65b-2c7b-4e42-b5ab-5e334cdf86d3');
SELECT merge_users('d43a4f93-5640-4898-b461-862aee06454b', 'b331bae7-0f2d-48b5-bc8a-37a205c8014f');
SELECT merge_users('8c1b8ca0-815a-4cec-b62b-a678e22b048e', '903cbf54-f93f-44e7-8ff3-add48fc8dca7');
SELECT merge_users('beb00624-cabc-42bb-b237-0bd01c3da80c', '6d5a3c95-8008-4e42-9720-3726d5796821');
SELECT merge_users('d84931ae-a158-426e-a349-5f82dfec511a', '81568718-21df-42e8-aed9-714054ff1374');
SELECT merge_users('fb66addf-b214-48c9-8635-2450c19aa4d4', '5b12baf7-82db-4ece-ac63-05dac21fe028');
SELECT merge_users('caa80a4e-03ed-4738-a3db-93a81a5c3cef', 'bb0caa86-7944-46e8-b226-ac6628b1bfaa');
SELECT merge_users('72eaec08-75d0-405e-bbfe-c50d5d2c27ff', 'f453cee9-dfb2-403f-9296-95a619eac748');

-- ============================================
-- JURI NEAR-DUPLICATES (prefix Pak/Kang/Ka/Bu)
-- ============================================
SELECT merge_users('7c0f7458-dee6-42a2-af07-cad5c1540288', '90738410-8fe2-4ea5-8629-b2e9deb3dc3b');
SELECT merge_users('0b964d62-f828-4143-8ac3-aea1c076a560', '0f268320-50f4-4cb2-bdcf-6eab3ee2d6db');
SELECT merge_users('2f47f403-70d6-40a1-bebd-7036e8576177', '5e4aa697-d397-4536-8425-7bcc7b1b73a5');
SELECT merge_users('2dd406e5-7071-4829-9103-825e786e332b', '6f66b0bb-f065-435f-90f1-f338466643cf');
SELECT merge_users('2dd406e5-7071-4829-9103-825e786e332b', '27716527-d279-4f37-b1ac-e02c89e5b59b');
SELECT merge_users('0a72eead-d606-458e-af8e-3af858cd7d02', 'e1ece6df-99fa-477b-8e5c-5815febc2d05');
SELECT merge_users('78784222-c0b9-4cb0-94b7-fd63b4da2dfa', '29cd1f75-9721-489d-a56a-31a6ee51d770');
SELECT merge_users('9a1995d7-5586-4ab4-89ec-82b6c72701ca', 'c1414d0d-43f4-4ed7-91a9-1bbd231a2c85');
SELECT merge_users('389964a8-6725-4bc3-908e-27b9951087f9', '60f7e93e-a218-4ffc-8726-a16b3131f403');
SELECT merge_users('535f1925-0d58-4668-89d3-2f734c8473cf', '28a081d5-494f-42f4-b24f-07d4c479be74');
SELECT merge_users('ed9010f1-ab3d-4220-b4a8-7e385074753d', '12457875-2e4f-40ff-8445-95e45631942d');
SELECT merge_users('c8b2d90f-464d-4a23-b906-0116d89238f2', '4235e266-b1a1-4f03-b9f9-0725ea2b4639');
SELECT merge_users('b74a5b1b-5a8a-4b0b-87de-06b0d4171eea', 'bca7f39f-c5ce-43c3-ab8b-844b256a559b');
SELECT merge_users('aeeeb217-9003-4da5-b101-b4ef7c9642e4', '5f4c6720-4339-4ebd-97b9-5890f553315b');
SELECT merge_users('f9bb96d1-2fdf-4ed2-8f2e-f4552e699d39', 'cdbbdee5-8a34-415b-a403-1a3eddfb2518');
SELECT merge_users('f9e194d0-6aab-48f4-9438-5210f8779227', '7b029660-f66f-49ca-a3ed-d07ff214a2a1');
SELECT merge_users('1516248d-22bc-424d-b2c2-987b4a3ef727', 'd1c26f79-bf0a-47f0-8d4f-cd29e3130457');
SELECT merge_users('7dd8261a-11cc-4283-97fb-2744dc778c7c', 'ca941740-9404-4273-8bad-30cfbbd814ee');
SELECT merge_users('f4fc7f34-3b6a-47b1-a323-5b1b35c59d14', '0cbdeba1-f4aa-47ef-ae77-f09cc88f642e');
SELECT merge_users('37375d12-2d3a-4dc5-a370-8f0d68fa6600', 'a9c8668d-a459-4a8c-aacc-6e358b880454');

-- ============================================
-- PANITIA DUPLICATES
-- ============================================
SELECT merge_users('d84b2b8a-d35d-4a16-9bca-44fd8d91da92', 'a05a395d-28fc-43a2-8d6c-948384c6373c');
SELECT merge_users('65a60e2c-0d9d-4ab6-a4c8-3a7c4000c0d8', '21db6da9-7084-48bc-af69-067426a669a0');

-- ============================================
-- PESERTA EXACT DUPLICATES (from earlier query)
-- For each pair: keep first account, merge second into it
-- ============================================
SELECT merge_users('fe3d7f7e-10f5-4a46-85ba-ed0308f576a1', '867b75d8-02d0-401e-a2b6-24568eb9c73f');
SELECT merge_users('e16e22f6-c4c0-4911-a2f1-4948889a6151', 'e1041ad6-eaba-4518-8a94-4b4b8ded785b');
SELECT merge_users('a9137303-f1bb-4ded-9f99-357c4a81dd3d', '22e87306-57fb-4b72-a2b8-b1e03e875d79');
SELECT merge_users('f8e3675b-62e1-4944-8107-2c9bb1e4c4be', '73630cab-65d1-40f2-9438-49cf32efb632');
SELECT merge_users('605ee24f-2e9d-42af-adb8-1b6cd6fc1f1c', '50ae63b3-04b9-4163-8a4e-ff9637073c4f');
SELECT merge_users('06b2a74b-bcc3-4fa2-9ca4-7abe468f548c', 'aedf44e2-777b-4c1b-9661-6e8435422ff8');
SELECT merge_users('c339dab3-364d-4a10-9c91-e32e41005d59', '42fa6301-2172-4c23-aa5f-0ad9e1e5b777');
SELECT merge_users('642c8a2c-091a-410c-8056-866b63427164', '7f8cce3e-108e-4da8-9f44-9825d6949fe4');
SELECT merge_users('25d26ea6-3f03-4f92-9e25-b7f0ccd87cd4', '270eaef1-bf3c-4bde-8b12-c19eb85a7b44');
SELECT merge_users('64b0038d-58f8-4413-92ce-fb0660a01b33', '14c6d032-e814-4586-ae16-b84926c2e879');
SELECT merge_users('6a0ed7d0-22f6-4650-a512-ffc3cc76da42', 'f807e5b3-c01c-4db5-a9ab-770b7698bd97');
SELECT merge_users('16025d54-f300-4f7f-8bbc-b2a2413919ea', 'c9cc92e8-2242-4ca9-a0a7-77b61bc1971c');
SELECT merge_users('2bd19028-ef97-4bc1-bdcd-fdc913c0bbef', '6e26b6d4-d64e-45d7-a308-4c6d836b01ef');
SELECT merge_users('ac1e7968-28a9-470b-bb56-488ac3af893e', '3dccefb3-2e45-4593-b5c7-b6c810d12aa0');
SELECT merge_users('2ec66a35-0699-4ff5-a003-033460a9e7b7', '3f4fc044-969c-4f97-81d6-aa2460ae3c33');
SELECT merge_users('30b095ec-1b10-4217-becc-044a7ddfc482', '4bda230a-61d4-45da-bc48-9adcc58b7760');
SELECT merge_users('32be1fe0-baf8-41b0-a8aa-8562b0b4a9ea', 'ea847b79-7844-4dc3-bab5-39b8e18838f1');
SELECT merge_users('15812302-36ca-4632-8ae2-f1d70249fd08', '612b1ef1-2553-463f-8f23-1ee4a910f98f');
SELECT merge_users('d6b6b14e-6c46-44cb-a051-12da0f9f261c', 'e5ddcf12-16e9-4753-b0b7-6939034930be');
SELECT merge_users('a400c05d-d7d2-4e75-b738-3c8640a6773e', '64cd4de9-8408-461a-9616-f8fc5c161622');
SELECT merge_users('cd8a2eb7-8a0d-43f6-8a5e-f1b8f81b5238', '8cd7d065-633a-4bbb-8da8-2745debbcc79');
SELECT merge_users('e42538c1-5424-4568-9b61-7eea8ffb415d', 'e65ddd91-d27d-47f1-95f4-6f3b7cbb41ea');
SELECT merge_users('4e021e5b-3de7-41d2-b5d5-9d5382eb8bb6', 'c05429c5-63ea-443b-947c-3d6d908bb242');
SELECT merge_users('f6f3df50-47f9-46df-ba1c-e12f45fa34d1', '30a4e319-0e52-4ee1-883f-17a7fb91170f');
SELECT merge_users('12926604-5658-431b-907b-bbf7d52c34c9', '529e8e43-be92-45f5-811b-10fc8ca636a4');
SELECT merge_users('3c2b3e05-ec4e-4132-b616-ab600fab4907', '3a5db653-5d11-4894-ae72-41d566a3cef4');
SELECT merge_users('8744d3cf-bc5c-4f02-995d-184dd7c79161', '556454a5-4c66-4bee-87a5-e213bdad8e93');
SELECT merge_users('ae661a81-9392-4925-9a84-b9fd010c5557', '6fb3c47f-76ea-4b77-9824-c4a9d3b8d008');
SELECT merge_users('7ed3ef97-e040-4e66-9d9d-f1509530874b', '4da46879-d091-4426-b3a2-11d8bf638a27');
SELECT merge_users('1618209a-8fd7-4e55-b14d-ea39b91df10c', '875b25da-6c60-4dba-9735-5180fb930da4');
SELECT merge_users('21993f68-abf5-44c1-9fd1-433177b4c869', '7fddc643-09e1-4690-96b4-b14fb38a069a');
SELECT merge_users('fbeb49d5-1279-46c8-b18d-84b541a781cb', '202f3b49-9eaa-4bf4-9391-ccc9871fbe85');
SELECT merge_users('b416f25d-ec72-466e-9028-b0f72af31736', '91d0b37d-709e-401a-a586-7b9b62ed2d5b');
SELECT merge_users('649ed3e2-8c81-481e-8e14-0bdf063d7ed7', '33b7efea-8603-4cda-ba69-4d06aae8bc1e');
SELECT merge_users('479309b3-0d25-4588-b299-864bc6896f92', '5b799330-0b13-492b-8858-abc41489c061');
SELECT merge_users('92905840-6401-4a6c-95cc-de97f142d4cb', '8a3ea5b0-a8df-4618-94eb-276c0c623795');
SELECT merge_users('92914be1-dae4-468e-8e86-e00674892b8d', 'a9cced6f-942a-4117-82cc-c88c33dee60b');
SELECT merge_users('9471ca65-005f-4fd2-be91-98ea6a95d405', '54382741-1dcd-4a72-8ea0-a1a716dcb374');
SELECT merge_users('44c0feb6-025a-49ab-9e1a-09d81adf1514', '315f5299-2ad0-4589-b4a6-fc1380e82a77');
SELECT merge_users('f40525df-9f01-4518-bbd1-e8c571220c9d', 'e1f26dcb-48e3-4f58-bf77-4cdb3748edbe');
SELECT merge_users('edc94f03-2b21-42d3-853d-9ad2347d3531', '435297ba-5c05-49e8-9498-2905d64d2e10');
SELECT merge_users('0bf39db5-a40c-4557-a4ab-84821042502e', '469f3dc3-2308-45ad-9c9a-1c79323cdef6');
SELECT merge_users('01672e99-72ef-4877-830b-394a7941f010', '0a91d677-71be-4072-8a0c-3639ed220e92');
SELECT merge_users('9881fbf2-af8a-42a0-86f0-40ad7b36a268', 'bc3f2867-9062-4982-8191-cd269f324079');
SELECT merge_users('96af0845-131c-4a8d-ba05-314238fdbfbe', '624a793c-726d-4cbf-9eb1-6895dc25ab5c');
SELECT merge_users('dcddb68a-6063-408f-b86b-5d6b0e13fef1', '89cfe1b6-1c82-4ceb-b3cb-2617735c5b87');
SELECT merge_users('ac2ed9dc-d44a-4056-8f24-c9a78083e8ea', '5a946255-ec57-4ccd-88ff-9b4156a01d95');
SELECT merge_users('9531234f-6a8d-4a30-a0c1-e7e24cdae1e1', 'b964ce09-c818-4cff-b74a-369e5f8ace18');

-- PESERTA near-duplicates (spacing differences)
-- SMPN 1 CIAMPEL (2 accounts)
SELECT merge_users('025eb35b-fda6-4a6b-a2d3-64ca289b33ac', 'ae403721-bc93-4e78-87a5-8a631f5c0eac');
-- SMPN 1 CIOMAS (2 accounts)
SELECT merge_users('bb7ccbc7-0d7a-4d88-8675-c6769bb9f01d', 'a4b8d548-a526-4fa6-a43b-0e8c7f011ed7');
-- SMPN 1 CIBUNGBULANG (2 accounts)
SELECT merge_users('52cee765-144a-41cd-b96c-4f6dc8608294', 'edd3c024-4f7c-4ea2-a670-5df7ab2f36cf');
-- SMPN 1 GARUT (2 accounts)
SELECT merge_users('9f1d2942-59ed-4dbf-abbd-59e8bcfa91a8', '91960914-e3b0-4a05-8dee-c4bd4b4953b7');
-- SMPN 1 MUARA GEMBONG / MUARAGEMBONG (3 accounts)
SELECT merge_users('ef678088-de3f-4dcf-8f3c-41778b173006', 'e345fc40-5b64-41e8-a3b6-b02e78db0e23');
SELECT merge_users('ef678088-de3f-4dcf-8f3c-41778b173006', 'a25f141f-88d2-4260-9b5f-47166f47d6fb');
-- SMPN 1 PANGATIKAN (2 accounts)
SELECT merge_users('530b0e99-bfd2-4e3f-a87a-2145b19dc460', 'cf3f561b-bbee-41b5-8aa4-c62b9d697f3c');
-- SMPN 1 SINGAJAYA (2 accounts)
SELECT merge_users('44188e06-dbe4-4dcd-81d5-1d6debfe063b', '6f2deafe-f8d1-4249-afea-24b7f78df608');
-- SMPN 1 SINGAPARNA (2 accounts with extra space)
SELECT merge_users('f9122db6-fcdd-4bf3-a43a-7ee9bf51b1c3', 'cb96b6f6-a274-4c43-9739-0ead14314149');
-- SMPN 1 CIKARANG SELATAN (2 accounts)
SELECT merge_users('a3add117-4142-40d9-b5e6-fbfb8153488b', 'bea38d60-54cd-45b6-bc1e-9bb0bb437d39');
-- SMPN 16 PONTIANAK (2 accounts)
SELECT merge_users('a856e5e9-e771-480a-bb2e-21aed31dba3d', '5f804bc3-a438-4a2d-9572-ba8f7e799665');
-- SMP N 1 NGAGLIK (2 accounts with extra space)
SELECT merge_users('13c57f50-2ab4-4273-8a85-bc1d926cda37', '606e4508-691b-45c0-a3e7-6f8a5f6f216a');
-- SMPN 2 BAYONGBONG (2 accounts)
SELECT merge_users('df861b61-d5f6-48d3-b42d-a0ebcd3cd758', '5d1658be-0a83-4956-8474-6a36cdaeed9f');
-- SMPN 2 CIBALONG (2 accounts)
SELECT merge_users('b7931d89-52a1-43e6-ad26-66b80f2011cb', '5aa4099b-f5a7-4bec-8739-0f4d15bac78d');
-- SMPN 2 KOTA BARU (2 accounts)
SELECT merge_users('79001841-f2fc-43dd-ab81-4609be4d93fc', '5fef9738-869f-4a92-b5a4-bc0cf1ca41ce');
-- SMPN 2 RENGAS DENGKLOK (2 accounts)
SELECT merge_users('64bdbb23-f49b-46e2-863a-896c431adce3', '5a1331a7-d52d-475b-89e3-b14da80c10cf');
-- SMPN 2 RANCAEKEK (2 accounts)
SELECT merge_users('c684146f-b0d9-4204-b3e8-49bbdb681ba8', 'ee506df4-9b79-480b-b0d9-b6ca98780b94');
-- SMPN 2 SUKARAJA (3 accounts)
SELECT merge_users('916566ef-da02-42d9-b368-e75c1d023089', '72a52a3e-f968-4005-9384-309c5c879d11');
SELECT merge_users('916566ef-da02-42d9-b368-e75c1d023089', '26f13fde-9105-49c1-8652-dc898c45dbd7');
-- SMPN 2 SUNGAI AMBAWANG (2 accounts)
SELECT merge_users('6a4c4757-5ccf-4e8c-9197-7b6de89db3f6', '1193fbca-2a45-41f2-8d83-ce31e3f5c058');
-- SMPN 2 TAROGONG KALER (2 accounts)
SELECT merge_users('96fef185-2bdc-4627-b882-fe5e93a4d7bc', 'f3213a0a-a548-46ff-b360-fa2edbeb1d96');

-- Normalize names for kept accounts
UPDATE users SET name = 'Sandi Gifari' WHERE id = '4168133a-3db8-4402-852b-121e8409976f';
UPDATE users SET name = 'Eza Pratama' WHERE id = 'b74a5b1b-5a8a-4b0b-87de-06b0d4171eea';
UPDATE users SET name = 'Komandin' WHERE id = '556807f2-b091-4b2a-8d79-bc68960fb494';

-- Drop the function
DROP FUNCTION merge_users;

COMMIT;

/**
 * Import data from legacy MariaDB SQL dump into PostgreSQL (Prisma)
 *
 * Usage: npx ts-node prisma/seed-import.ts
 *
 * Imports: Users, Events, Assessment Categories, Participants,
 *          Jury Assignments, Materials (soal), Evaluations (penilaian)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// SQL Parser - Extracts INSERT VALUES from MySQL dump
// ============================================================================

function parseSqlInsert(content: string, tableName: string): any[][] {
  const marker = `INSERT INTO \`${tableName}\` VALUES\n`;
  const rows: any[][] = [];

  // Find ALL occurrences of INSERT INTO for this table
  let searchFrom = 0;
  const valueBlocks: string[] = [];
  while (true) {
    const startIdx = content.indexOf(marker, searchFrom);
    if (startIdx === -1) break;
    const valuesStart = startIdx + marker.length;

    // Find end of INSERT statement - look for ; outside quotes
    let endIdx = valuesStart;
    let inQ = false;
    let esc = false;
    while (endIdx < content.length) {
      const ch = content[endIdx];
      if (esc) { esc = false; endIdx++; continue; }
      if (ch === '\\') { esc = true; endIdx++; continue; }
      if (ch === '\'') { inQ = !inQ; endIdx++; continue; }
      if (!inQ && ch === ';') break;
      endIdx++;
    }
    valueBlocks.push(content.substring(valuesStart, endIdx));
    searchFrom = endIdx + 1;
  }

  if (valueBlocks.length === 0) return [];

  for (const valuesStr of valueBlocks) {
  let i = 0;

  while (i < valuesStr.length) {
    while (i < valuesStr.length && valuesStr[i] !== '(') i++;
    if (i >= valuesStr.length) break;
    i++; // skip '('

    const row: any[] = [];
    while (i < valuesStr.length) {
      // Skip whitespace
      while (i < valuesStr.length && (valuesStr[i] === ' ' || valuesStr[i] === '\t' || valuesStr[i] === '\n' || valuesStr[i] === '\r')) i++;

      if (i >= valuesStr.length) break;

      if (valuesStr[i] === '\'') {
        // String value
        i++; // skip opening quote
        let str = '';
        while (i < valuesStr.length) {
          if (valuesStr[i] === '\\' && i + 1 < valuesStr.length) {
            const next = valuesStr[i + 1];
            if (next === 'n') str += '\n';
            else if (next === 'r') str += '\r';
            else if (next === 't') str += '\t';
            else if (next === '0') str += '\0';
            else str += next;
            i += 2;
          } else if (valuesStr[i] === '\'' && i + 1 < valuesStr.length && valuesStr[i + 1] === '\'') {
            str += '\'';
            i += 2;
          } else if (valuesStr[i] === '\'') {
            i++; // skip closing quote
            break;
          } else {
            str += valuesStr[i];
            i++;
          }
        }
        row.push(str);
      } else if (valuesStr.substring(i, i + 4) === 'NULL') {
        row.push(null);
        i += 4;
      } else {
        // Number or other value
        let val = '';
        while (i < valuesStr.length && valuesStr[i] !== ',' && valuesStr[i] !== ')') {
          val += valuesStr[i];
          i++;
        }
        const trimmed = val.trim();
        if (trimmed.length > 0) {
          const num = Number(trimmed);
          row.push(isNaN(num) ? trimmed : num);
        }
      }

      // Skip comma or end
      if (i < valuesStr.length && valuesStr[i] === ',') {
        i++; // skip comma between values
      } else if (i < valuesStr.length && valuesStr[i] === ')') {
        i++; // skip closing paren
        break;
      }
    }

    if (row.length > 0) {
      rows.push(row);
    }
  }
  } // end for valueBlocks

  return rows;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeCategoryName(name: string): string {
  let n = name.toUpperCase().trim().replace(/\s+/g, ' ');
  // Common spelling normalizations
  if (n === 'VAFOR') n = 'VARFOR';
  if (n === 'MAKE UP') n = 'MAKEUP';
  if (n === 'VARIASI DAN FORMASI') n = 'VARIASI & FORMASI';
  if (n === 'VARIASI FORMASI') n = 'VARIASI & FORMASI';
  return n;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function makeUniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base);
  if (!slug) slug = 'event';
  if (!existing.has(slug)) {
    existing.add(slug);
    return slug;
  }
  let counter = 2;
  while (existing.has(`${slug}-${counter}`)) counter++;
  const unique = `${slug}-${counter}`;
  existing.add(unique);
  return unique;
}

const ROLE_MAP: Record<string, string> = {
  admin: 'SUPERADMIN',
  panitia: 'PANITIA',
  juri: 'JURI',
  peserta: 'PESERTA',
  affiliator: 'PESERTA',
  pelatih: 'PELATIH',
};

const SCORE_CAT_COLORS: Record<string, string> = {
  'Kurang': '#ef4444',
  'Cukup': '#f59e0b',
  'Baik': '#22c55e',
  'Sangat Baik': '#3b82f6',
};

function convertScoreCategories(kategoriDataStr: string | null): any[] {
  if (!kategoriDataStr) return [];
  try {
    const data = JSON.parse(kategoriDataStr);
    const entries = Object.entries(data);
    return entries.map(([name, values]: [string, any], idx) => ({
      name,
      color: SCORE_CAT_COLORS[name] || ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'][idx % 4],
      order: idx,
      options: (values as string[]).map((v: string, oi: number) => ({
        name: v,
        score: parseFloat(v) || 0,
        order: oi,
      })),
    }));
  } catch {
    return [];
  }
}

function determineScoreCategory(
  nilai: number,
  kategoriData: Record<string, string[]>
): string | null {
  const valStr = String(Math.round(nilai));
  const valStr2 = String(nilai);
  for (const [catName, values] of Object.entries(kategoriData)) {
    if (values.includes(valStr) || values.includes(valStr2)) {
      return catName;
    }
  }
  return null;
}

async function batchCreateMany<T>(
  modelDelegate: any,
  data: T[],
  batchSize: number = 500
): Promise<number> {
  let created = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const result = await modelDelegate.createMany({
      data: batch,
      skipDuplicates: true,
    });
    created += result.count;
  }
  return created;
}

// ============================================================================
// Main Import
// ============================================================================

async function main() {
  console.log('Starting data import from legacy MariaDB dump...\n');

  const sqlPath = path.join(__dirname, '../../database/u235383302_simpaskor.sql');
  console.log(`Reading SQL dump from: ${sqlPath}`);
  const content = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`File size: ${(content.length / 1024 / 1024).toFixed(2)} MB\n`);

  // ---- Parse all tables ----
  console.log('Parsing SQL tables...');
  const oldUsers = parseSqlInsert(content, 'users');
  // users: id(0), name(1), username(2), password(3), role(4), avatar(5), created_at(6), updated_at(7), referral_code(8)
  console.log(`  Users: ${oldUsers.length}`);

  const oldEvents = parseSqlInsert(content, 'events');
  // events: id(0), name(1), location(2), banner_image_path(3), panitia_id(4), created_at(5), event_date(6)
  console.log(`  Events: ${oldEvents.length}`);

  const oldCategories = parseSqlInsert(content, 'event_categories');
  // event_categories: id(0), event_id(1), name(2)
  console.log(`  Event Categories: ${oldCategories.length}`);

  const oldEventUsers = parseSqlInsert(content, 'event_users');
  // event_users: id(0), event_id(1), user_id(2), nomor_urut(3), kategori_sekolah(4)
  console.log(`  Event Users: ${oldEventUsers.length}`);

  const oldJuriKategori = parseSqlInsert(content, 'juri_kategori');
  // juri_kategori: id(0), user_id(1), event_category_id(2)
  console.log(`  Juri Kategori: ${oldJuriKategori.length}`);

  const oldSoal = parseSqlInsert(content, 'soal');
  // soal: id(0), id_event(1), id_kategori(2), soal(3), kategori_data(4), kategori_sekolah(5), created_at(6), nomor_urut(7)
  console.log(`  Soal: ${oldSoal.length}`);

  const oldPenilaian = parseSqlInsert(content, 'penilaian');
  // penilaian: id(0), soal_id(1), juri_id(2), peserta_id(3), nilai(4), alasan(5), created_at(6), updated_at(7)
  console.log(`  Penilaian: ${oldPenilaian.length}\n`);

  // Build lookup sets
  const oldEventIds = new Set(oldEvents.map((e) => e[0] as string));
  const oldUserMap = new Map<string, any[]>(); // user_id -> row
  for (const u of oldUsers) {
    oldUserMap.set(u[0] as string, u);
  }

  // ========================================================================
  // Step 1: School Categories
  // ========================================================================
  console.log('[1/9] Creating School Categories...');
  const schoolCatData = [
    { name: 'SD', description: 'Sekolah Dasar', order: 1 },
    { name: 'SMP', description: 'Sekolah Menengah Pertama', order: 2 },
    { name: 'SMA', description: 'Sekolah Menengah Atas', order: 3 },
    { name: 'PURNA', description: 'Purna Paskibraka', order: 4 },
    { name: 'UMUM', description: 'Kategori Umum', order: 5 },
  ];
  for (const sc of schoolCatData) {
    await prisma.schoolCategory.upsert({
      where: { name: sc.name },
      update: {},
      create: { name: sc.name, description: sc.description, order: sc.order },
    });
  }
  const schoolCatMap = new Map<string, string>(); // name -> id
  const schoolCats = await prisma.schoolCategory.findMany();
  for (const sc of schoolCats) {
    schoolCatMap.set(sc.name, sc.id);
  }
  console.log(`  Created/verified ${schoolCats.length} school categories\n`);

  // ========================================================================
  // Step 2: Assessment Categories
  // ========================================================================
  console.log('[2/9] Creating Assessment Categories...');
  // Collect unique normalized names from event_categories (skip orphaned)
  const uniqueCatNames = new Set<string>();
  for (const cat of oldCategories) {
    const eventId = cat[1] as string | null;
    const name = cat[2] as string | null;
    if (!eventId || !name || !oldEventIds.has(eventId)) continue;
    uniqueCatNames.add(normalizeCategoryName(name));
  }

  let catOrder = 0;
  for (const catName of uniqueCatNames) {
    await prisma.assessmentCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName, order: catOrder++ },
    });
  }
  const assessCatMap = new Map<string, string>(); // normalized name -> id
  const assessCats = await prisma.assessmentCategory.findMany();
  for (const ac of assessCats) {
    assessCatMap.set(ac.name, ac.id);
  }
  console.log(`  Created ${uniqueCatNames.size} assessment categories\n`);

  // ========================================================================
  // Step 3: Users
  // ========================================================================
  console.log('[3/9] Creating Users...');
  const usedEmails = new Set<string>();
  const userCreateData: any[] = [];

  for (const u of oldUsers) {
    const id = u[0] as string;
    const name = (u[1] as string) || 'Unnamed';
    const username = (u[2] as string) || id.substring(0, 8);
    const password = (u[3] as string) || '';
    const role = u[4] as string;
    const createdAt = u[6] ? new Date(u[6] as string) : new Date();

    let email = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}@simpaskor.id`;
    if (usedEmails.has(email)) {
      email = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}_${id.substring(0, 8)}@simpaskor.id`;
    }
    usedEmails.add(email);

    const mappedRole = ROLE_MAP[role] || 'PESERTA';

    userCreateData.push({
      id,
      email,
      passwordHash: password,
      name,
      role: mappedRole,
      status: 'ACTIVE',
      emailVerified: true,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const usersCreated = await batchCreateMany(prisma.user, userCreateData);
  console.log(`  Created ${usersCreated} users (${userCreateData.length} total)\n`);

  // ========================================================================
  // Step 4: Events
  // ========================================================================
  console.log('[4/9] Creating Events...');
  const eventIdMap = new Map<string, string>(); // old_event_id -> new_event_id
  const existingSlugs = new Set<string>();

  // Pre-fetch existing slugs
  const existingEvents = await prisma.event.findMany({ select: { slug: true } });
  for (const e of existingEvents) {
    if (e.slug) existingSlugs.add(e.slug);
  }

  // Pre-fetch existing user IDs to verify createdById exists
  const existingUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  const eventCreateData: any[] = [];
  for (const ev of oldEvents) {
    const oldId = ev[0] as string;
    const name = (ev[1] as string) || 'Unnamed Event';
    const location = ev[2] as string | null;
    const panitiaId = ev[4] as string | null;
    const createdAtStr = ev[5] as string | null;
    const eventDateStr = ev[6] as string;

    const newId = crypto.randomUUID();
    eventIdMap.set(oldId, newId);

    const eventDate = new Date(eventDateStr);
    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();

    // createdById must reference an existing user
    let createdById: string | undefined = panitiaId || undefined;
    if (!createdById || !existingUserIds.has(createdById)) {
      // Use first available admin/superadmin, or first user
      const fallbackUser = await prisma.user.findFirst({
        where: { role: 'SUPERADMIN' },
        select: { id: true },
      });
      createdById = fallbackUser?.id;
      if (!createdById) {
        const anyUser = await prisma.user.findFirst({ select: { id: true } });
        createdById = anyUser?.id;
      }
      if (!createdById) {
        console.log(`  WARNING: Skipping event "${name}" - no valid creator user`);
        eventIdMap.delete(oldId);
        continue;
      }
    }

    const slug = makeUniqueSlug(name, existingSlugs);

    eventCreateData.push({
      id: newId,
      title: name,
      slug,
      location,
      startDate: eventDate,
      endDate: eventDate,
      status: 'COMPLETED',
      wizardStep: 0,
      wizardCompleted: true,
      createdById,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const eventsCreated = await batchCreateMany(prisma.event, eventCreateData);
  console.log(`  Created ${eventsCreated} events\n`);

  // ========================================================================
  // Step 5: EventAssessmentCategory
  // ========================================================================
  console.log('[5/9] Creating Event Assessment Categories...');
  // Map old event_categories.id -> new EventAssessmentCategory.id
  const oldCatIdToEacId = new Map<number, string>();
  // Also map old event_categories.id -> old event_id (for soal mapping)
  const oldCatIdToOldEventId = new Map<number, string>();

  const eacCreateData: any[] = [];
  const eacUniqueCheck = new Set<string>(); // "eventId|assessCatId"

  for (const cat of oldCategories) {
    const oldCatId = cat[0] as number;
    const oldEventId = cat[1] as string | null;
    const catName = cat[2] as string | null;

    if (!oldEventId || !catName || !oldEventIds.has(oldEventId)) continue;

    const newEventId = eventIdMap.get(oldEventId);
    if (!newEventId) continue;

    const normalizedName = normalizeCategoryName(catName);
    const assessCatId = assessCatMap.get(normalizedName);
    if (!assessCatId) continue;

    const uniqueKey = `${newEventId}|${assessCatId}`;
    if (eacUniqueCheck.has(uniqueKey)) {
      // Duplicate event+category combo (e.g., same category name in same event)
      // Map the old ID to the already-created EAC
      for (const [existingOldId, existingEacId] of oldCatIdToEacId) {
        const existingEventId = oldCatIdToOldEventId.get(existingOldId);
        if (existingEventId === oldEventId) {
          const existingNorm = normalizeCategoryName(
            oldCategories.find((c) => c[0] === existingOldId)?.[2] as string || ''
          );
          if (existingNorm === normalizedName) {
            oldCatIdToEacId.set(oldCatId, existingEacId);
            oldCatIdToOldEventId.set(oldCatId, oldEventId);
            break;
          }
        }
      }
      continue;
    }
    eacUniqueCheck.add(uniqueKey);

    const eacId = crypto.randomUUID();
    oldCatIdToEacId.set(oldCatId, eacId);
    oldCatIdToOldEventId.set(oldCatId, oldEventId);

    eacCreateData.push({
      id: eacId,
      eventId: newEventId,
      assessmentCategoryId: assessCatId,
    });
  }

  // Also map duplicate oldCatIds that weren't handled above
  for (const cat of oldCategories) {
    const oldCatId = cat[0] as number;
    if (oldCatIdToEacId.has(oldCatId)) continue;
    const oldEventId = cat[1] as string | null;
    const catName = cat[2] as string | null;
    if (!oldEventId || !catName || !oldEventIds.has(oldEventId)) continue;
    const newEventId = eventIdMap.get(oldEventId);
    if (!newEventId) continue;
    const normalizedName = normalizeCategoryName(catName);
    const assessCatId = assessCatMap.get(normalizedName);
    if (!assessCatId) continue;
    // Find existing EAC for this event+category
    for (const [existingOldId, existingEacId] of oldCatIdToEacId) {
      const eac = eacCreateData.find((e) => e.id === existingEacId);
      if (eac && eac.eventId === newEventId && eac.assessmentCategoryId === assessCatId) {
        oldCatIdToEacId.set(oldCatId, existingEacId);
        oldCatIdToOldEventId.set(oldCatId, oldEventId);
        break;
      }
    }
  }

  const eacCreated = await batchCreateMany(prisma.eventAssessmentCategory, eacCreateData);
  console.log(`  Created ${eacCreated} event-assessment-category links\n`);

  // ========================================================================
  // Step 6: EventParticipation + ParticipationGroup
  // ========================================================================
  console.log('[6/9] Creating Participant registrations...');

  // Determine user roles from old DB
  const userRoleMap = new Map<string, string>(); // user_id -> role
  for (const u of oldUsers) {
    userRoleMap.set(u[0] as string, u[4] as string);
  }

  // Group event_users by (event_id, user_id) to handle multiple entries
  const participantEntries = new Map<string, any[]>(); // "eventId|userId" -> event_users rows
  const juriEntries: any[][] = [];

  for (const eu of oldEventUsers) {
    const oldEventId = eu[1] as string | null;
    const userId = eu[2] as string | null;
    if (!oldEventId || !userId) continue;
    if (!oldEventIds.has(oldEventId) || !eventIdMap.has(oldEventId)) continue;
    if (!existingUserIds.has(userId)) continue;

    const role = userRoleMap.get(userId);
    if (role === 'juri') {
      juriEntries.push(eu);
    } else {
      const key = `${oldEventId}|${userId}`;
      if (!participantEntries.has(key)) participantEntries.set(key, []);
      participantEntries.get(key)!.push(eu);
    }
  }

  // Create EventParticipation + ParticipationGroup
  const participationCreateData: any[] = [];
  const groupCreateData: any[] = [];
  // Mapping: (old_event_id, user_id) -> participationId
  const participationIdMap = new Map<string, string>();
  // Mapping: (old_event_id, user_id, school_cat) -> groupId
  const groupIdMap = new Map<string, string>();
  // Mapping: (old_event_id, user_id) -> first groupId (fallback)
  const firstGroupMap = new Map<string, string>();

  for (const [key, rows] of participantEntries) {
    const parts = key.split('|');
    const oldEventId = parts[0]!;
    const userId = parts[1]!;
    const newEventId = eventIdMap.get(oldEventId)!;

    // First row determines the main school category
    const firstRow = rows[0]!;
    const firstSchoolCat = firstRow[4] as string | null;
    const schoolCatId = firstSchoolCat ? schoolCatMap.get(firstSchoolCat.toUpperCase()) : null;

    const participationId = crypto.randomUUID();
    participationIdMap.set(key, participationId);

    const userName = oldUserMap.get(userId)?.[1] as string || 'Unknown';

    participationCreateData.push({
      id: participationId,
      eventId: newEventId,
      userId,
      schoolCategoryId: schoolCatId || null,
      teamName: userName,
      schoolName: userName,
      status: 'CONFIRMED',
    });

    // Create ParticipationGroup for each unique school category entry
    const seenCats = new Set<string>();
    for (const row of rows) {
      const schoolCatName = row[4] as string | null;
      const nomorUrut = row[3] as number | null;
      const catKey = schoolCatName?.toUpperCase() || 'UMUM';

      if (seenCats.has(catKey)) continue;
      seenCats.add(catKey);

      const grpSchoolCatId = schoolCatMap.get(catKey) ?? schoolCatMap.get('UMUM')!;
      const groupId = crypto.randomUUID();

      const groupKey = `${oldEventId}|${userId}|${catKey}`;
      groupIdMap.set(groupKey, groupId);
      if (!firstGroupMap.has(`${oldEventId}|${userId}`)) {
        firstGroupMap.set(`${oldEventId}|${userId}`, groupId);
      }

      groupCreateData.push({
        id: groupId,
        participationId,
        schoolCategoryId: grpSchoolCatId,
        groupName: userName,
        teamMembers: 1,
        orderNumber: typeof nomorUrut === 'number' ? nomorUrut : null,
        status: 'ACTIVE',
      });
    }
  }

  const partCreated = await batchCreateMany(prisma.eventParticipation, participationCreateData);
  console.log(`  Created ${partCreated} event participations`);

  const grpCreated = await batchCreateMany(prisma.participationGroup, groupCreateData);
  console.log(`  Created ${grpCreated} participation groups\n`);

  // ========================================================================
  // Step 7: JuryEventAssignment + JuryAssignedCategory
  // ========================================================================
  console.log('[7/9] Creating Jury assignments...');

  // Group juri entries by (event, jury)
  const juriByEventUser = new Map<string, string>(); // "oldEventId|juryId" -> assignmentId
  const assignmentCreateData: any[] = [];
  const assignedCatCreateData: any[] = [];

  for (const eu of juriEntries) {
    const oldEventId = eu[1] as string;
    const juryId = eu[2] as string;
    const key = `${oldEventId}|${juryId}`;

    if (juriByEventUser.has(key)) continue;

    const newEventId = eventIdMap.get(oldEventId);
    if (!newEventId) continue;

    const assignmentId = crypto.randomUUID();
    juriByEventUser.set(key, assignmentId);

    assignmentCreateData.push({
      id: assignmentId,
      juryId,
      eventId: newEventId,
      status: 'CONFIRMED',
    });
  }

  const assgnCreated = await batchCreateMany(prisma.juryEventAssignment, assignmentCreateData);
  console.log(`  Created ${assgnCreated} jury assignments`);

  // Create JuryAssignedCategory from juri_kategori
  for (const jk of oldJuriKategori) {
    const juryUserId = jk[1] as string;
    const oldCatId = jk[2] as number;

    const oldEventId = oldCatIdToOldEventId.get(oldCatId);
    if (!oldEventId) continue;

    const assignmentKey = `${oldEventId}|${juryUserId}`;
    const assignmentId = juriByEventUser.get(assignmentKey);
    if (!assignmentId) continue;

    const eacId = oldCatIdToEacId.get(oldCatId);
    if (!eacId) continue;

    // Find the assessment category ID from the EAC
    const eacData = eacCreateData.find((e) => e.id === eacId);
    if (!eacData) continue;

    assignedCatCreateData.push({
      assignmentId,
      assessmentCategoryId: eacData.assessmentCategoryId,
    });
  }

  // Deduplicate assigned categories
  const assignedCatUnique = new Map<string, any>();
  for (const ac of assignedCatCreateData) {
    const key = `${ac.assignmentId}|${ac.assessmentCategoryId}`;
    if (!assignedCatUnique.has(key)) {
      assignedCatUnique.set(key, { ...ac, id: crypto.randomUUID() });
    }
  }

  const assignedCatCreated = await batchCreateMany(
    prisma.juryAssignedCategory,
    Array.from(assignedCatUnique.values())
  );
  console.log(`  Created ${assignedCatCreated} jury category assignments\n`);

  // ========================================================================
  // Step 8: EventMaterial (from soal)
  // ========================================================================
  console.log('[8/9] Creating Event Materials from soal...');
  const soalToMaterialId = new Map<string, string>(); // old soal.id -> new EventMaterial.id
  const soalKategoriData = new Map<string, Record<string, string[]>>(); // soal.id -> parsed kategori_data
  const materialCreateData: any[] = [];
  const materialUniqueCheck = new Set<string>(); // "eventId|eacId|number"

  // Track number counters per (event, eac) for unique numbering
  const numberCounters = new Map<string, number>(); // "eventId|eacId" -> next number

  for (const s of oldSoal) {
    const soalId = s[0] as string;
    const oldEventId = s[1] as string;
    const oldCatId = s[2] as number;
    const materialName = (s[3] as string) || 'Materi';
    const kategoriDataStr = s[4] as string | null;
    const schoolCat = s[5] as string | null;
    const nomorUrut = s[7] as number;

    const newEventId = eventIdMap.get(oldEventId);
    if (!newEventId) continue;

    const eacId = oldCatIdToEacId.get(oldCatId);
    if (!eacId) continue;

    // Parse and store kategori_data for later use in penilaian mapping
    if (kategoriDataStr) {
      try {
        soalKategoriData.set(soalId, JSON.parse(kategoriDataStr));
      } catch {}
    }

    // Determine unique number
    const counterKey = `${newEventId}|${eacId}`;
    let number = nomorUrut || 0;
    const uniqueKey = `${newEventId}|${eacId}|${number}`;
    if (materialUniqueCheck.has(uniqueKey)) {
      // Increment until unique
      const current = numberCounters.get(counterKey) || 1;
      number = current;
      while (materialUniqueCheck.has(`${newEventId}|${eacId}|${number}`)) {
        number++;
      }
    }
    numberCounters.set(counterKey, number + 1);
    materialUniqueCheck.add(`${newEventId}|${eacId}|${number}`);

    const materialId = crypto.randomUUID();
    soalToMaterialId.set(soalId, materialId);

    // Convert score categories
    const scoreCategories = convertScoreCategories(kategoriDataStr);

    // School category IDs for this material
    const schoolCategoryIds: string[] = [];
    if (schoolCat) {
      const scId = schoolCatMap.get(schoolCat.toUpperCase());
      if (scId) schoolCategoryIds.push(scId);
    }

    materialCreateData.push({
      id: materialId,
      eventId: newEventId,
      eventAssessmentCategoryId: eacId,
      number,
      name: materialName,
      order: number,
      scoreCategories,
      schoolCategoryIds,
    });
  }

  const matCreated = await batchCreateMany(prisma.eventMaterial, materialCreateData);
  console.log(`  Created ${matCreated} event materials\n`);

  // ========================================================================
  // Step 9: MaterialEvaluation (from penilaian)
  // ========================================================================
  console.log('[9/9] Creating Material Evaluations from penilaian...');
  console.log(`  Processing ${oldPenilaian.length} scoring records in batches...`);

  // Build soal -> event mapping for fast lookup
  const soalEventMap = new Map<string, string>(); // soal_id -> old_event_id
  for (const s of oldSoal) {
    soalEventMap.set(s[0] as string, s[1] as string);
  }

  let evalCreated = 0;
  let evalSkipped = 0;
  const evalBatch: any[] = [];
  const evalUniqueCheck = new Set<string>();

  for (let i = 0; i < oldPenilaian.length; i++) {
    const p = oldPenilaian[i]!;
    const soalId = p[1] as string;
    const juriId = p[2] as string;
    const pesertaId = p[3] as string;
    const nilai = p[4] as number | null;
    const alasan = p[5] as string | null;
    const createdAtStr = p[6] as string | null;

    // Get material ID
    const materialId = soalToMaterialId.get(soalId);
    if (!materialId) { evalSkipped++; continue; }

    // Get event ID (old)
    const oldEventId = soalEventMap.get(soalId);
    if (!oldEventId) { evalSkipped++; continue; }

    const newEventId = eventIdMap.get(oldEventId);
    if (!newEventId) { evalSkipped++; continue; }

    // Check jury exists
    if (!existingUserIds.has(juriId)) { evalSkipped++; continue; }

    // Find participant group ID
    // Try with soal's school category first
    const soalRow = oldSoal.find((s) => s[0] === soalId);
    const soalSchoolCat = soalRow?.[5] as string | null;
    let participantId: string | undefined;

    if (soalSchoolCat) {
      const groupKey = `${oldEventId}|${pesertaId}|${soalSchoolCat.toUpperCase()}`;
      participantId = groupIdMap.get(groupKey);
    }
    if (!participantId) {
      participantId = firstGroupMap.get(`${oldEventId}|${pesertaId}`);
    }
    if (!participantId) {
      // Peserta might not be in event_users - skip
      evalSkipped++;
      continue;
    }

    // Determine score category name
    let scoreCategoryName: string | null = null;
    if (nilai !== null && nilai !== undefined) {
      const katData = soalKategoriData.get(soalId);
      if (katData) {
        scoreCategoryName = determineScoreCategory(nilai, katData);
      }
    }

    // Unique check
    const uniqueKey = `${newEventId}|${materialId}|${juriId}|${participantId}`;
    if (evalUniqueCheck.has(uniqueKey)) { evalSkipped++; continue; }
    evalUniqueCheck.add(uniqueKey);

    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();

    evalBatch.push({
      eventId: newEventId,
      materialId,
      juryId: juriId,
      participantId,
      score: nilai !== null ? Number(nilai) : null,
      scoreCategoryName,
      notes: alasan,
      scoredAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    // Flush batch
    if (evalBatch.length >= 500) {
      const result = await prisma.materialEvaluation.createMany({
        data: evalBatch,
        skipDuplicates: true,
      });
      evalCreated += result.count;
      evalBatch.length = 0;
      if ((i + 1) % 10000 === 0) {
        console.log(`  Progress: ${i + 1}/${oldPenilaian.length} (${evalCreated} created, ${evalSkipped} skipped)`);
      }
    }
  }

  // Flush remaining
  if (evalBatch.length > 0) {
    const result = await prisma.materialEvaluation.createMany({
      data: evalBatch,
      skipDuplicates: true,
    });
    evalCreated += result.count;
  }

  console.log(`  Created ${evalCreated} material evaluations (${evalSkipped} skipped)\n`);

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('='.repeat(60));
  console.log('Import Complete!');
  console.log('='.repeat(60));
  console.log(`  School Categories: ${schoolCats.length}`);
  console.log(`  Assessment Categories: ${uniqueCatNames.size}`);
  console.log(`  Users: ${usersCreated}`);
  console.log(`  Events: ${eventsCreated}`);
  console.log(`  Event Assessment Categories: ${eacCreated}`);
  console.log(`  Participations: ${partCreated}`);
  console.log(`  Participation Groups: ${grpCreated}`);
  console.log(`  Jury Assignments: ${assgnCreated}`);
  console.log(`  Jury Category Assignments: ${assignedCatCreated}`);
  console.log(`  Event Materials: ${matCreated}`);
  console.log(`  Material Evaluations: ${evalCreated}`);
  console.log('='.repeat(60));
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

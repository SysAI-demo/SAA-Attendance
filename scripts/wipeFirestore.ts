import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const COLLECTIONS = [
  'employees',
  'office_locations',
  'attendance_records',
  'leave_requests',
  'permission_requests',
  'notifications',
  'user_activity_logs',
  'system_definitions',
];

async function wipeDatabase() {
  console.log('Starting Firestore deletion for database:', firebaseConfig.firestoreDatabaseId || 'default');
  let totalDeleted = 0;

  for (const colName of COLLECTIONS) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Collection ${colName}: found ${snapshot.size} documents.`);
      
      if (snapshot.size > 0) {
        const batch = writeBatch(db);
        let count = 0;
        for (const docSnap of snapshot.docs) {
          batch.delete(docSnap.ref);
          count++;
        }
        await batch.commit();
        console.log(`Deleted ${count} documents from ${colName}.`);
        totalDeleted += count;
      }
    } catch (err) {
      console.error(`Error wiping collection ${colName}:`, err);
    }
  }

  console.log(`Firestore wipe finished! Total documents deleted: ${totalDeleted}`);

  // Also wipe server data file
  const serverDbFile = path.join(process.cwd(), 'data', 'saata-database.json');
  if (fs.existsSync(serverDbFile)) {
    const emptyDb = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      employees: [],
      locations: [],
      attendance: [],
      leaves: [],
      permissions: [],
      notifications: [],
      activityLogs: [],
      definitions: {
        leaves: [],
        permissions: [],
        grades: [],
        taPolicy: {
          lateGraceMinutes: 15,
          earlyCheckoutGraceMinutes: 15,
          overtimeGraceMinutes: 30,
          halfDayCutoffHours: 4,
          fullDayCutoffHours: 8,
          weeklyHolidayDays: [0], // Sunday
          biometricMandatory: false,
          faceRecognitionMandatory: false,
          allowRemotePunch: false,
          lockDeviceToOneEmployee: true,
          requireLeaveApproval: true,
          requirePermissionSlip: true,
          autoCheckoutAtMidnight: true,
        },
        holidays: [],
        workSchedule: {
          id: 'ws_default',
          name: 'Standard General Shift',
          shiftType: 'general',
          shiftStart: '09:00',
          shiftEnd: '17:00',
          breakMinutes: 60,
          workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        },
      },
      deviceBindings: {},
    };
    fs.writeFileSync(serverDbFile, JSON.stringify(emptyDb, null, 2), 'utf-8');
    console.log(`Server DB file ${serverDbFile} reset to clean empty state.`);
  }
}

wipeDatabase().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Failed to wipe:', err);
  process.exit(1);
});

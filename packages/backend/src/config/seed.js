import fs from 'fs';
import User from '../models/User.js';
import CalendarEvent from '../models/CalendarEvent.js';
import MessDailyMenu from '../models/MessDailyMenu.js';
import MessWeeklyMenu from '../models/MessWeeklyMenu.js';
import TimetableClass from '../models/TimetableClass.js';
import TimetableMetadata from '../models/TimetableMetadata.js';
import StudyMaterial from '../models/StudyMaterial.js';

/**
 * Seed default accounts.
 */
const seedUsers = async () => {
  try {
    // Prune non-production user accounts for compliance and safety guidelines
    const allowedEmails = [
      'admin@campos.local',
      'superadmin@campos.local',
      'canteen@campos.local',
      'student@campos.local'
    ];
    const deleteResult = await User.deleteMany({ email: { $nin: allowedEmails } });
    if (deleteResult.deletedCount > 0) {
      console.log(`🧹 Cleared ${deleteResult.deletedCount} staging user accounts for safety compliance.`);
    }

    const adminExists = await User.findOne({ role: 'admin' });
    const superAdminExists = await User.findOne({ role: 'super_admin' });
    const canteenAdminExists = await User.findOne({ role: 'canteen_admin' });

    if (!adminExists) {
      await User.create({
        email: 'admin@campos.local',
        password: '$2b$12$GlT5mlcNr.Nb/bT5AoX1mOt5TCRvN9/FFanXd3KWAjFZH9/4aKQhW',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        mustChangePassword: false,
        isEmailVerified: true,
      });

      console.log('\n' + '═'.repeat(60));
      console.log('🔐 DEFAULT ADMIN ACCOUNT CREATED');
      console.log('═'.repeat(60));
      console.log(`   Email:    admin@campos.local`);
      console.log(`   Password: [ENCRYPTED]`);
      console.log(`   Role:     admin`);
      console.log('═'.repeat(60) + '\n');
    } else {
      console.log('👤 Admin account already exists. Skipping seed.');
    }

    if (!superAdminExists) {
      await User.create({
        email: 'superadmin@campos.local',
        password: '$2b$12$7Ow.Jub1ZSWQk7DTTHU6cOYhiYjaBnTVw0/t5.DybIi48Mr3oA/Ci',
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        mustChangePassword: false,
        isEmailVerified: true,
      });

      console.log('\n' + '═'.repeat(60));
      console.log('🔐 DEFAULT SUPER ADMIN ACCOUNT CREATED');
      console.log('═'.repeat(60));
      console.log(`   Email:    superadmin@campos.local`);
      console.log(`   Password: [ENCRYPTED]`);
      console.log(`   Role:     super_admin`);
      console.log('═'.repeat(60) + '\n');
    } else {
      console.log('👤 Super Admin account already exists. Skipping seed.');
    }

    if (!canteenAdminExists) {
      await User.create({
        email: 'canteen@campos.local',
        password: '$2b$12$aedVPIUW4Chn.4d.hRri7eYSNOZd0GsWzZUOaObQjv4ER822EttZK',
        role: 'canteen_admin',
        firstName: 'Canteen',
        lastName: 'Counter',
        mustChangePassword: false,
        isEmailVerified: true,
      });

      console.log('\n' + '═'.repeat(60));
      console.log('🔐 DEFAULT CANTEEN COUNTER ADMIN ACCOUNT CREATED');
      console.log('═'.repeat(60));
      console.log(`   Email:    canteen@campos.local`);
      console.log(`   Password: [ENCRYPTED]`);
      console.log(`   Role:     canteen_admin`);
      console.log('═'.repeat(60) + '\n');
    } else {
      console.log('🍔 Canteen Counter Admin account already exists. Skipping seed.');
    }

    // Seed default demo student account
    const studentExists = await User.findOne({ email: 'student@campos.local' });
    if (!studentExists) {
      await User.create({
        email: 'student@campos.local',
        password: '$2b$12$pJ9oB8JBj18KWE/LVOCQge66/rLnZpsEiP2h0fl3PE9DbqCNA3eZe',
        role: 'student',
        firstName: 'Student',
        lastName: 'Gahlot',
        mustChangePassword: false,
        isEmailVerified: true,
        studentProfile: {
          enrollmentId: 'DEMO-0001',
          grade: '1st Year',
          branch: 'Computer Science & Engineering',
          section: 'A',
          hostel: 'Hostel Block D',
          roomNumber: '404',
        }
      });

      console.log('\n' + '═'.repeat(60));
      console.log('🔐 DEFAULT DEMO STUDENT ACCOUNT CREATED');
      console.log('═'.repeat(60));
      console.log(`   Email:    student@campos.local`);
      console.log(`   Password: [ENCRYPTED]`);
      console.log(`   Role:     student`);
      console.log(`   Enroll:   DEMO-0001`);
      console.log('═'.repeat(60) + '\n');
    } else {
      if (studentExists.studentProfile?.branch === 'Computer Science') {
        studentExists.studentProfile.branch = 'Computer Science & Engineering';
        await studentExists.save();
        console.log('🔄 Updated demo student profile branch to Computer Science & Engineering');
      } else {
        console.log('🎓 Demo student account already exists. Skipping seed.');
      }
    }
    // Migrate any user accounts that still have "Computer Science" as branch to "Computer Science & Engineering"
    const migrationResult = await User.updateMany(
      { 'studentProfile.branch': 'Computer Science' },
      { $set: { 'studentProfile.branch': 'Computer Science & Engineering' } }
    );
    if (migrationResult.modifiedCount > 0) {
      console.log(`🔄 Migrated ${migrationResult.modifiedCount} student accounts from 'Computer Science' to 'Computer Science & Engineering'`);
    }
  } catch (err) {
    console.error('❌ Failed to seed user accounts:', err.message);
  }
};

/**
 * Seed Calendar events.
 */
const seedCalendar = async () => {
  try {
    const exists = await CalendarEvent.findOne({});
    if (!exists) {
      const defaultEvents = [
        {
          date: 'Tuesday, November 18, 2025',
          category: 'Project / Dissertation',
          tags: ['Odd Sem', 'Deadline'],
          desc: 'Major Project allocation for next year by',
          theme: 'teal'
        },
        {
          date: 'Tuesday, November 18, 2025',
          category: 'Project / Dissertation',
          tags: ['Odd Sem', 'Deadline'],
          desc: 'Minor Project allocation for next Semester by',
          theme: 'teal'
        },
        {
          date: 'Thursday, November 20, 2025',
          category: 'Project / Dissertation',
          tags: ['Odd Sem', 'Exam'],
          desc: 'Final Project Viva / End-Term Seminar / Evaluation of Dissertation',
          theme: 'teal'
        },
        {
          date: 'Friday, November 21, 2025',
          category: 'Feedback',
          tags: ['Odd Sem', 'Deadline'],
          desc: "Students' Online Feed Back Collection by",
          theme: 'rose'
        },
        {
          date: 'Tuesday, November 25, 2025',
          category: 'Attendance Review',
          tags: ['Odd Sem', 'Academic'],
          desc: 'End Semester Attendance Review',
          theme: 'amber'
        },
        {
          date: 'Tuesday, November 25, 2025',
          category: 'Project / Dissertation',
          tags: ['Odd Sem', 'Deadline'],
          desc: 'Submission of Project/Dissertation reports/Term Paper',
          theme: 'teal'
        },
        {
          date: 'Friday, November 28, 2025',
          category: 'End of Classes',
          tags: ['Odd Sem', 'Deadline'],
          desc: 'Classes to be over',
          theme: 'magenta'
        },
        {
          date: 'Friday, November 28, 2025',
          category: 'Academic',
          tags: ['Odd Sem', 'Meeting'],
          desc: 'Academic Council Meeting',
          theme: 'purple'
        }
      ];

      await CalendarEvent.insertMany(defaultEvents);
      console.log('📅 Calendar events seeded successfully!');
    } else {
      console.log('📅 Calendar database already contains events. Skipping seed.');
    }
  } catch (err) {
    console.error('❌ Failed to seed Calendar events:', err.message);
  }
};

/**
 * Seed Mess Menu.
 */
const seedMess = async () => {
  try {
    const dailyExists = await MessDailyMenu.findOne({});
    if (!dailyExists) {
      const defaultDaily = [
        {
          mealId: 'bf',
          title: 'Breakfast',
          time: '< 9:00 AM',
          items: ['Chana Masala', 'Puri', 'Halwa']
        },
        {
          mealId: 'lh',
          title: 'Lunch',
          time: '12:00 - 14:00',
          items: ['Matar Paneer', 'Veg Khichdi', 'Dahi', 'Papad']
        },
        {
          mealId: 'dn',
          title: 'Dinner',
          time: 'From 19:30',
          items: ['Methi Aloo', 'Chana Dal', 'Rice', 'Roti', 'Milk']
        }
      ];
      await MessDailyMenu.insertMany(defaultDaily);
      console.log('🍱 Daily mess menu seeded successfully!');
    } else {
      console.log('🍱 Daily mess menu already exists. Skipping seed.');
    }

    const weeklyExists = await MessWeeklyMenu.findOne({});
    if (!weeklyExists) {
      const defaultWeekly = [
        { day: 'Monday', breakfast: 'Aloo Paratha & Curd', lunch: 'Rajma Chawal, Roti, Salad', dinner: 'Matar Paneer, Dal Fry, Rice' },
        { day: 'Tuesday', breakfast: 'Idli Vada & Sambar', lunch: 'Kadhi Chawal, Aloo Bhindi', dinner: 'Chicken Curry / Egg Bhurji, Rice' },
        { day: 'Wednesday', breakfast: 'Poha & Jalebi', lunch: 'Chole Bhature, Veg Pulav', dinner: 'Kadhai Paneer, Dal Makhani' },
        { day: 'Thursday', breakfast: 'Uttapam & Chutney', lunch: 'Veg Biryani & Mix Raita', dinner: 'Mix Veg, Dal Tadka, Roti' },
        { day: 'Friday', breakfast: 'Bread Butter & Omelette', lunch: 'Dal Baati Churma, Salad', dinner: 'Butter Chicken / Shahi Paneer, Naan' },
        { day: 'Saturday', breakfast: 'Puri Sabzi & Halwa', lunch: 'Chana Masala, Jeera Rice', dinner: 'Veg Manchurian & Fried Rice' },
        { day: 'Sunday', breakfast: 'Masala Dosa & Sambar', lunch: 'Special Sunday Paneer Feast', dinner: 'Aloo Gobi, Yellow Dal, Khichdi' }
      ];
      await MessWeeklyMenu.insertMany(defaultWeekly);
      console.log('🍱 Weekly mess menu seeded successfully!');
    } else {
      console.log('🍱 Weekly mess menu already exists. Skipping seed.');
    }
  } catch (err) {
    console.error('❌ Failed to seed Mess menu:', err.message);
  }
};

/**
 * Seed Timetable.
 */
const seedTimetable = async () => {
  try {
    let metaExists = await TimetableMetadata.findOne({});
    if (metaExists && !metaExists.courses) {
      console.log('⌛ Existing TimetableMetadata is missing "courses" field. Deleting and re-seeding...');
      await TimetableMetadata.deleteMany({});
      metaExists = null;
    }
    const classesExists = await TimetableClass.findOne({});

    if (!metaExists || !classesExists) {
      console.log('⌛ Fetching Timetable database from CDN to seed...');
      
      let metadata = null;
      let classesObj = null;

      try {
        const metaRes = await fetch('https://raw.githubusercontent.com/codelif/jiit-planner-cdn/refs/heads/main/metadata.json');
        metadata = await metaRes.json();

        const classesRes = await fetch('https://raw.githubusercontent.com/codelif/jiit-planner-cdn/refs/heads/main/classes.json');
        classesObj = await classesRes.json();
      } catch (fetchErr) {
        console.error('⚠️ Failed to fetch timetable from CDN, using mock fallback data:', fetchErr.message);
      }

      if (!metaExists) {
        if (metadata) {
          await TimetableMetadata.create({
            courses: metadata.courses,
            semesters: metadata.semesters,
            phases: metadata.phases,
            batches: metadata.batches
          });
          console.log('📚 Timetable metadata seeded from CDN successfully!');
        } else {
          // Mock metadata fallback
          await TimetableMetadata.create({
            courses: [
              { id: "btech-62", name: "B.Tech Sec-62" },
              { id: "btech-128", name: "B.Tech Sec-128" }
            ],
            semesters: { "btech-62": [{ id: "sem2", name: "2" }] },
            phases: { "btech-62": { "sem2": [{ id: "phase1", name: "1" }] } },
            batches: { "btech-62": { "sem2": { "phase1": [{ id: "g2", name: "G2" }] } } }
          });
          console.log('📚 Timetable mock metadata seeded successfully!');
        }
      }

      if (!classesExists) {
        if (classesObj) {
          const insertArray = [];
          for (const [classKey, batchData] of Object.entries(classesObj)) {
            if (batchData && batchData.classes) {
              for (const [day, dayClasses] of Object.entries(batchData.classes)) {
                for (const c of dayClasses) {
                  insertArray.push({
                    classKey,
                    day,
                    subject: c.subject,
                    start: c.start,
                    end: c.end,
                    teacher: c.teacher || 'Faculty',
                    venue: c.venue || 'N/A',
                    type: c.type || 'L',
                    batches: c.batches || []
                  });
                }
              }
            }
          }

          // Insert in chunks of 1000 to prevent document limit errors
          const chunkSize = 1000;
          for (let i = 0; i < insertArray.length; i += chunkSize) {
            const chunk = insertArray.slice(i, i + chunkSize);
            await TimetableClass.insertMany(chunk);
          }
          console.log(`📚 Timetable classes seeded from CDN successfully (${insertArray.length} slots)!`);
        } else {
          // Mock classes fallback
          const mockClasses = [
            { classKey: 'btech-62_sem2_phase1_g2', day: 'Monday', subject: 'Software Engineering', start: '9:00 AM', end: '9:50 AM', teacher: 'Dr. Shruti', venue: 'LT-2', type: 'L', batches: ['G2'] },
            { classKey: 'btech-62_sem2_phase1_g2', day: 'Monday', subject: 'Database Systems', start: '10:00 AM', end: '10:50 AM', teacher: 'Prof. Sandeep', venue: 'LT-2', type: 'L', batches: ['G2'] },
            { classKey: 'btech-62_sem2_phase1_g2', day: 'Monday', subject: 'Operating Systems Lab', start: '11:00 AM', end: '12:50 PM', teacher: 'Dr. Amit', venue: 'CL-1', type: 'P', batches: ['G2'] },
            { classKey: 'btech-62_sem2_phase1_g2', day: 'Tuesday', subject: 'Computer Networks', start: '9:00 AM', end: '9:50 AM', teacher: 'Dr. Vivek', venue: 'LT-1', type: 'L', batches: ['G2'] },
            { classKey: 'btech-62_sem2_phase1_g2', day: 'Tuesday', subject: 'Database Systems Lab', start: '10:00 AM', end: '11:50 AM', teacher: 'Prof. Sandeep', venue: 'CL-3', type: 'P', batches: ['G2'] }
          ];
          await TimetableClass.insertMany(mockClasses);
          console.log('📚 Timetable mock classes seeded successfully!');
        }
      }
    } else {
      console.log('📚 Timetable database already contains classes/metadata. Skipping seed.');
    }

    // Deduplicate on startup to clean up duplicates from concurrent process launches / restarts
    const finalCount = await TimetableClass.countDocuments({});
    if (finalCount > 0) {
      const allSlots = await TimetableClass.find({});
      const seenSlots = new Set();
      const duplicateSlotIds = [];
      for (const c of allSlots) {
        const key = `${c.classKey}_${c.day}_${c.subject}_${c.start}_${c.end}_${c.teacher}_${c.venue}_${c.type}_${(c.batches || []).sort().join(',')}`;
        if (seenSlots.has(key)) {
          duplicateSlotIds.push(c._id);
        } else {
          seenSlots.add(key);
        }
      }
      if (duplicateSlotIds.length > 0) {
        console.log(`🧹 Deduplicating: removing ${duplicateSlotIds.length} duplicate timetable class slots...`);
        const chunkSize = 500;
        for (let i = 0; i < duplicateSlotIds.length; i += chunkSize) {
          const chunk = duplicateSlotIds.slice(i, i + chunkSize);
          await TimetableClass.deleteMany({ _id: { $in: chunk } });
        }
      }
    }
  } catch (err) {
    console.error('❌ Failed to seed Timetable database:', err.message);
  }
};

const seedStudyMaterials = async () => {
  try {
    const count = await StudyMaterial.countDocuments({});
    // If the database has fewer than 100 materials (meaning it only had the old mock seed), we clear and seed the full list.
    if (count < 100) {
      console.log('📚 Clearing and seeding full study materials directory from SaatvikChauhan/JIIT-Shelf...');
      await StudyMaterial.deleteMany({});

      const filePath = new URL('./extracted_materials.json', import.meta.url);
      const fileData = fs.readFileSync(filePath, 'utf8');
      const defaultMaterials = JSON.parse(fileData);

      const chunkSize = 1000;
      for (let i = 0; i < defaultMaterials.length; i += chunkSize) {
        const chunk = defaultMaterials.slice(i, i + chunkSize);
        await StudyMaterial.insertMany(chunk);
      }
      console.log(`📚 Study materials seeded successfully (${defaultMaterials.length} items)!`);
    } else {
      console.log('📚 Study materials already seeded. Skipping.');
    }
  } catch (err) {
    console.error('❌ Failed to seed study materials:', err.message);
  }
};

const seedAdmin = async () => {
  await seedUsers();
  await seedCalendar();
  await seedMess();
  await seedTimetable();
  await seedStudyMaterials();
};

export default seedAdmin;

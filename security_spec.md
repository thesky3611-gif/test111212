# Security Specification — AI-Class Eval Studio

## 1. Data Invariants
1. **Teacher Isolation**: Every collection and subcollection under `/teachers/{teacherId}` is strictly owned by `teacherId == request.auth.uid` with verified email (`request.auth.token.email_verified == true`). No teacher can read, list, create, update, or delete another teacher's profile, classes, students, activities, or evaluations.
2. **Relational Integrity**:
   - A `ClassGroup` cannot exist without an existing parent `TeacherProfile`.
   - A `Student` cannot exist without an existing parent `ClassGroup` owned by the teacher.
   - An `Activity` cannot be created unless its referenced `classId` exists under `/teachers/{teacherId}/classes/{classId}` and is owned by the teacher.
   - An `Evaluation` cannot be created unless its referenced `activityId` exists under `/teachers/{teacherId}/activities/{activityId}` AND its referenced `studentId` exists under `/teachers/{teacherId}/classes/{classId}/students/{studentId}`.
3. **Immutable Ownership & Temporal Integrity**:
   - `teacherId`, `classId`, `activityId`, `studentId`, and `createdAt` are immutable after creation.
   - `createdAt` (on create) and `updatedAt` (on create & update) must strictly equal `request.time`.
4. **Volumetric & Key Bounds**:
   - All document IDs match `^[a-zA-Z0-9_\-]+$` and are `<= 128` chars.
   - Every string field enforces `.size()` bounds; every array enforces bounded `.size()` limits; `keys().hasAll(...)` and `keys().hasOnly(...)` prevent shadow/ghost fields.
5. **Terminal State Protection**:
   - Once an `Activity` reaches `status == 'archived'`, subsequent content modifications are blocked (only unarchiving or leaving immutable is controlled explicitly; archived activities cannot be silently altered).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Profile Read**: Unauthenticated or Teacher B tries `get /teachers/teacherA`. -> `PERMISSION_DENIED`
2. **Teacher Directory Scrape**: Teacher B runs `list /teachers`. -> `PERMISSION_DENIED` (list disabled on `/teachers`)
3. **Unverified Email Write**: Auth user with `email_verified: false` attempts `create /teachers/{uid}`. -> `PERMISSION_DENIED`
4. **Identity Spoofing on Class**: Teacher B creates `/teachers/teacherB/classes/c1` with `teacherId: "teacherA"`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection (Ghost Field)**: Teacher A creates a student with extra field `isAdmin: true`. -> `PERMISSION_DENIED`
6. **ID Poisoning**: Teacher A writes `/teachers/teacherA/classes/../../../etc` or 500-char ID. -> `PERMISSION_DENIED`
7. **Orphaned Evaluation**: Teacher A creates evaluation referencing non-existent `activityId` or `studentId`. -> `PERMISSION_DENIED`
8. **Fake Timestamp Forgery**: Teacher A creates activity with client-forged `createdAt` != `request.time`. -> `PERMISSION_DENIED`
9. **Immutable Parent Reassignment**: Teacher A updates evaluation to change `studentId` or `activityId`. -> `PERMISSION_DENIED`
10. **Array Exhaustion (DoW)**: Teacher A sends `attitudeLogs` with 200 items (`> 50` limit). -> `PERMISSION_DENIED`
11. **Value Type Poisoning**: Teacher A updates `totalScore` on evaluation to a 1MB string instead of a number `0..100`. -> `PERMISSION_DENIED`
12. **Archived Activity Tampering**: Teacher A updates `title` or `rubricCriteria` of an activity whose `status == 'archived'`. -> `PERMISSION_DENIED`

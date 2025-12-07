# File Reorganization Summary

## ✅ Completed

All Android knowledge base files have been reorganized into logical groups with sequential numbering.

## New Structure

### Beginners (01-08) - Fundamentals
1. Introduction to Android Architecture
2. SOLID Principles
3. Kotlin Coroutines Basics
4. Room Database & Data Persistence
5. Android Lifecycle Components
6. JVM Architecture & Java Memory Model
7. Java Threads & Concurrency Basics
8. Garbage Collection Fundamentals

### Intermediate (01-31) - Organized by Topic

**UI & Compose (01-05)**
1. Jetpack Compose State Management
2. Jetpack Compose UI Components & Theming
3. Navigation & Deep Links
4. ViewBinding & DataBinding
5. Testing Compose UIs

**Networking (06-09)**
6. Networking & API Integration
7. Bluetooth & BLE Communication
8. Socket Connections & Network Communication
9. WiFi & Network Management

**Data & Storage (10-12)**
10. Paging Library
11. Image Loading & Caching
12. File & Storage Management

**Background & Services (13-16)**
13. WorkManager & Background Tasks
14. Android Services - Complete Guide
15. AlarmManager & Scheduled Tasks
16. Broadcast Receivers

**System Components (17-19)**
17. Content Providers
18. App Widgets
19. Threads & Processes in Android

**Security & Permissions (20-21)**
20. Android Permissions
21. Security & Authentication

**Notifications & Firebase (22-23)**
22. Notifications & FCM
23. Firebase Integration

**Architecture & Libraries (24-26)**
24. Dependency Injection with Hilt
25. Kotlin Flow - Complete Guide
26. RxJava - Complete Guide

**Maps & Testing (27-28)**
27. Google Maps Integration
28. Unit Testing in Android

**Quality & Memory (29-31)**
29. Accessibility in Android
30. Object Lifecycle & References in Java
31. Advanced GC & Tuning

### Advanced (01-16) - Organized by Topic

**Performance & Profiling (01-03)**
1. Android Studio Profiler - Complete Mastery Guide
2. System Tracing - Complete Guide
3. Performance Profiling & Memory Leaks

**Architecture & Patterns (04-05)**
4. Building Offline-First Apps
5. Advanced Coroutines & Cancellation

**OS Internals (06-12)**
6. Android OS Internals - Architecture & Process Management
7. Android OS Internals - IPC & Binder
8. Android OS Internals - System Services
9. Android OS Internals - Rendering Pipeline
10. Android OS Internals - Power Management
11. Android OS Internals - Dex Loading & Optimization
12. Android OS Internals - Looper, Handler & MessageQueue

**Specialized Topics (13-16)**
13. NoSQL Databases in Android
14. ARCore & Augmented Reality
15. Perfecto - Complete Testing Platform Guide
16. Android GC & Memory Management

### Overachiever (01-04)
1. Designing Custom Renderers
2. Build Systems & Advanced Gradle
3. Large Scale App Architecture Case Study
4. Automotive Infotainment Development

## Changes Made

1. ✅ Files reorganized into logical topic groups
2. ✅ Sequential numbering within each level (no gaps)
3. ✅ File names updated to match new numbers
4. ✅ Frontmatter metadata updated (number, canonical_id)
5. ✅ Node.js version fixed (switched to Node 20 LTS)

## Next Steps

1. **Reindex Database**: Start dev server and run:
   ```bash
   curl -X POST http://localhost:3000/api/index
   ```
   Or use the admin UI to reindex.

2. **Update Prerequisites**: Review and update prerequisite references if needed (they may reference old numbers).

3. **Test Application**: Verify all files load correctly in the web interface.

4. **Commit Changes**: Commit the reorganized file structure.

## Node.js Version

**Important**: The project now uses Node.js 20 LTS. To ensure you're using the correct version:

```bash
# Set Node 20 as default (add to ~/.zshrc or ~/.bashrc)
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Or use nvm if installed
nvm use 20
```

The `better-sqlite3` module has been rebuilt for Node 20 and should work correctly now.


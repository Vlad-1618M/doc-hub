## MongoDB CLI Commands: 
### Database query help notes for `resume_db`: 
-  For more on _MongoDB_ see tutorial: [https://www.mongodb.com/docs/manual/tutorial/query-documents/](https://www.mongodb.com/docs/manual/tutorial/query-documents/)

### Prerequisites:
- refer to [dev_setup_readme.md](/docs/dev_setup_readme.md) to build environment: 
- if `doc-hub-mongo` is up, you can run shell call to login: 
```bash
docker exec -it doc-hub-mongo mongosh -u admin -p admin --authenticationDatabase admin
```
- Expected output:
    ```bash
    Current Mongosh Log ID:	67d6131d770027a882a00aa0
    Connecting to:		mongodb://<credentials>@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin&appName=mongosh+2.3.8
    Using MongoDB:		6.0.20
    Using Mongosh:		2.3.8

    For mongosh info see: https://www.mongodb.com/docs/mongodb-shell/

    ------
    The server generated these startup warnings when booting
    2025-03-13T20:36:16.033+00:00: Using the XFS filesystem is strongly recommended with the WiredTiger storage engine. See http://dochub.mongodb.org/core/prodnotes-filesystem
    2025-03-13T20:36:16.854+00:00: You are running this process as the root user, which is not recommended
    2025-03-13T20:36:16.854+00:00: /sys/kernel/mm/transparent_hugepage/enabled is 'always'. We suggest setting it to 'never' in this binary version
    2025-03-13T20:36:16.854+00:00: vm.max_map_count is too low
    ------
    test> 
    ```
___
### **Show Available Databases**:
```bash
db.adminCommand('listDatabases')
```
- This will list all available databases, including `resume_db`:
- Expected output:
    ```bash

    test> db.adminCommand('listDatabases')
    {
    databases: [
        { name: 'admin', sizeOnDisk: Long('102400'), empty: false },
        { name: 'config', sizeOnDisk: Long('757760'), empty: false },
        { name: 'local', sizeOnDisk: Long('73728'), empty: false },
        { name: 'resume_db', sizeOnDisk: Long('59494400'), empty: false }
    ],
    totalSize: Long('60428288'),
    totalSizeMb: Long('57'),
    ok: 1
    }
    test> 
    ```
---

### **Switch to `resume_db`**: 
- This switches the context to the `resume_db` database:
- Expected output:
```bash
admin> show dbs
admin      100.00 KiB
config     668.00 KiB
local       72.00 KiB
resume_db   56.74 MiB
admin> use resume_db
switched to db resume_db
resume_db> 
```
---

### **Show Available Collections**:
- This lists all collections inside `resume_db`, such as `api_keys` and `resume`:
- Expected output:
```bash
resume_db> show collections
api_keys
resume
resume_db> 
```
---

### **View All Documents in `resume` Collection**:
- This returns all documents stored in the `resume` collection, formatted for readability:
```bash
db.resume.find().pretty()
```
- Expected: - _partial output_:
    ```bash
    resume_db> db.resume.find().pretty()
    [
    {
        _id: ObjectId('67d5cd7cc750e10775031080'),
        resume: {
        name: { first_name: 'John', last_name: 'Quincy Adams' },
        location: {
            address: {
            country: 'USA',
            state: 'Massachusetts',
            city: 'Quincy',
            zip_code: '02169',
            timezone: 'EST (Eastern Standard Time)'
            }
        },
        contact: { email: 'jqadams@example.com', phone: '+1-617-555-1825' },
        job_title: {
            position: '6th President of the United States',
            role: 'Diplomat, Statesman, Legislator, Abolitionist'
        },
        summary: 'John Quincy Adams, the 6th President of the United States, was a prominent diplomat, congressman, and advocate for human rights. Known for negotiating the Treaty of Ghent, shaping the Monroe Doctrine, and later opposing slavery in Congress.',
    ```
---
### **View All Documents in `api_keys` Collection**:
- This returns all documents stored in the `api_keys` collection:
```bash
db.api_keys.find().pretty()
```
- Expected output:
    ```bash
    db.api_keys.find().pretty()
    [
    {
        _id: ObjectId('67d5cd46c750e10775030d75'),
        key: 'G`@bv3PW\'mr9K)6]$p|s*~*5-$vV?NWHoh3}d\'"H9Vmflsn:Wz@7_Na)!=lH7t3f'
    }
    ]

    ```
---
### **Find a Resume by First Name**:
- This searches for documents where the `first_name` inside `resume.name` is `"William"`.
```bash
db.resume.find({ "resume.name.first_name": "William" }).pretty()
```
---

### **Find Emails**:
```bash
db.resume.distinct("resume.contact.email")
```
- Find all emails: 
- Expected: - _partial output_:
    ```bash
    db.resume.distinct("resume.contact.email")
    [
    'john.adams@example.com',
    'jqadams@example.com',
    'jtyler@example.com',
    'lbjohnson@example.com',
    'mfillmore@example.com',
    'mvburen@example.com',
    'rhayes@example.com',
    'rnixon@example.com',
    'rreagan@example.com',
    'tjefferson@example.com',
    'troosevelt@example.com',
    'ugrant@example.com',
    'wharding@example.com',
    'wharrison@example.com',
    'whtaft@example.com',
    'wmckinley@example.com',
    'woodrow.wilson@example.com',
    'zachary.taylor@example.com'
    ]
    ```
- Find by email address:
    ```bash
    db.resume.find({ "resume.contact.email": "lbjohnson@example.com" }).pretty()
    ```
- Expected: - _partial output_:
    ```bash
    resume_db> db.resume.find({ "resume.contact.email": "lbjohnson@example.com" }).pretty()
        [
        {
            _id: ObjectId('67d5cd7ec750e107750310a2'),
            resume: {
            name: { first_name: 'Lyndon', last_name: 'B Johnson' },
            location: {
                address: {
                country: 'USA',
                state: 'Texas',
                city: 'Stonewall',
                zip_code: '78671',
                timezone: 'CST (Central Standard Time)'
                }
            },
            contact: { email: 'lbjohnson@example.com', phone: '+1-512-555-1963' },
            job_title: {
                position: '36th President of the United States',
                role: 'Statesman, Vice President, President, Legislator'
    ```
---

### **Find a Resume by Job Title**:
```bash
db.resume.find({ "resume.job_title.position": "36th President of the United States" }).pretty()
```
---

### **Find Object IDs**:
```bash
db.getCollection("resume").find({}, { _id: 1 }).toArray()
```
- Expected: - _partial output_:
    ```bash
    resume_db> db.getCollection("resume").find({}, { _id: 1 }).toArray()
    [
    { _id: ObjectId('67d5cdbbc750e107750311ac') },
    ... 30605 more items
    ]
    ```
- limite output count by `limit(3)`
``` bash
db.getCollection("resume").find({}, { _id: 1 }).limit(3).toArray() 
```
- Expected:
    ``` bash
    resume_db> db.getCollection("resume").find({}, { _id: 1 }).limit(3).toArray() 
    [
    { _id: ObjectId('67d5cd7cc750e10775031080') },
    { _id: ObjectId('67d5cd7dc750e10775031084') },
    { _id: ObjectId('67d5cd7dc750e10775031087') }
    ]
    resume_db> 
    ```
---

### **List All Unique First Names in `resume`**:
```bash
db.resume.distinct("resume.name.first_name")
```
- Returns a list of all unique first names in the `resume` collection:
- Expected:

    ```bash
    resume_db> db.resume.distinct("resume.name.first_name")
    [
    'Abraham',    'Andrew',   'Barack',
    'Benjamin',   'Bill',     'Calvin',
    'Chester',    'Donald',   'Dwight',
    'Franklin',   'George',   'Gerald',
    'Grover',     'Harry',    'Herbert',
    'James',      'Jimmy',    'Joe',
    'John',       'Lyndon',   'Martin',
    'Millard',    'Richard',  'Ronald',
    'Rutherford', 'Theodore', 'Thomas',
    'Ulysses',    'Warren',   'William',
    'Woodrow',    'Zachary'
    ]
    resume_db> 
    ```
- Returns a list of all unique last names in the `resume` collection:
- Expected:
    ```bash
    resume_db> db.resume.distinct("resume.name.last_name")
    [
    'A. Arthur',    'A. Garfield', 'Adams',
    'B Johnson',    'B. Hayes',    'Biden',
    'Buchanan',     'Carter',      'Cleveland',
    'Clinton',      'Coolidge',    'D. Eisenhower',
    'D. Roosevelt', 'F Kennedy',   'Fillmore',
    'Ford',         'G Harding',   'H Taft',
    'H. W. Bush',   'Harrison',    'Henry Harrison',
    'Hoover',       'Jackson',     'Jefferson',
    'Johnson',      'K. Polk',     'Lincoln',
    'Madison',      'McKinley',    'Monroe',
    'Nixon',        'Obama',       'Pierce',
    'Quincy Adams', 'Reagan',      'Roosevelt',
    'S Grant',      'S. Truman',   'Taylor',
    'Trump',        'Tyler',       'Van Buren',
    'W. Bush',      'Washington',  'Wilson'
    ]
    ```
---

### **Count Total Documents in `resume`**:
```bash
db.resume.countDocuments({})
```
- This returns the total number of documents in the `resume` collection.
- Expected:
    ```bash
    db.resume.countDocuments({})
    30705
    ```
---

### **Count Documents Matching a Job Title**:
- This returns the count of resumes where `position` is `"President"` using regexr search:
```bash
db.resume.countDocuments({ "resume.job_title.position": { $regex: "President", $options: "i" } })
```
- Or if actual position contexts is known - pass it in as is instead of '?' mark: 
```bash
db.resume.countDocuments({ "resume.job_title.position": " ? " })
```
---

### **Limit Number of Results Returned**:
```bash
db.resume.find().limit(5).pretty()
```
---

### **Notes:**
- Always check placeholders (e.g., `collection_name`, `your_object_id_here`, `email@example.com`) with actual values in yoru datat sets/ db entry: 
- `pretty()` for better readability of JSON output:
- `ObjectId()` when searching for `_id` fields.
- Be careful when running `deleteOne()` or `deleteMany()` commands as they permanently remove data:

---

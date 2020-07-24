const electron = require('electron');
const url = require('url');
const path = require('path');
const { protocol } = require('electron');
const { pipeline } = require('stream');

const{app, BrowserWindow} = electron;

let mainWindow;
const ipc = electron.ipcMain;
const MongoClient = require('mongodb').MongoClient;


app.on('ready',function(){
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(url.format({
        pathname: '/index.html',
        protocol: 'file:',
        slashes: true,
    }));

    const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
    MongoClient.connect(uri).then(function (mongo) 
    {
        console.log('Connected...');

        const collection = mongo.db("edfusion").collection("classrooms");
        const changeStream = collection.watch();

        changeStream.on('change',function(change)
        {
            console.log("ASDONJFOSDIHNFIOSDNF"+JSON.stringify(change));
    
            const query = {};
            collection.find(query).toArray().then(items =>
            {
                mainWindow.webContents.send('reply', JSON.stringify(items));
    
            }).catch(err => console.error(`Failed to find documents: ${err}`))
        });

    }).catch(function (err) {})

});



ipc.on('clicked', async function (event, value) 
{
    event.preventDefault();
    const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
    var data = await getData(uri);
    mainWindow.webContents.send('reply',data);

    

    //either work
    // mainWindow.webContents.send('reply', stuffDb);
    // event.sender.send('reply', 'value recieved is '+value);
});

async function getData(uri)
{
    await MongoClient.connect(uri)
    .then(async function (mongo) 
    {
        console.log('Connected...');

        const collection =  mongo.db("edfusion").collection("classrooms");

        // collection.deleteMany({ stuffs: "i got added" });

        await collection.insertOne
        (
            {
                "code":15927,
                "teacherID": "453125",
                "students":
                [
                    {
                        "student_id":"saidojasd",
                        "muted":false,
                        "confusion":40,
                    }
                ],
                "questions":
                [
                    {
                        "student_id":"saidojasd",
                        "question":"Why is sarvesh?"
                    }
                ],
                "ratings":[4,1,5]
            }
        );

        // await collection.insertOne
        // (
        //     {
        //         "email":"hi@gmail.com",
        //         "password":"duisdfisk",
        //         "code": 3457823,
        //         "statistics":
        //         [
        //             {
        //                 "classroomID": "asdfd324324",
        //                 "averageRating": 2,
        //                 "averageConfusion": 40,
        //                 "studentsAttended": 20
        //             }
        //         ]
        //     }
        // );

        const query = {};
        var data = null;
        await collection.find(query).toArray().then(items =>
        {
            data = JSON.stringify(items);

        }).catch(err => console.error(`Failed to find documents: ${err}`))

        return data;

    }).catch(function (err) {})

}
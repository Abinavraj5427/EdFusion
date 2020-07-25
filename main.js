const electron = require('electron');
const url = require('url');
const path = require('path');
const { protocol } = require('electron');
const { pipeline } = require('stream');
const { verify } = require('crypto');

const { app, BrowserWindow } = electron;

let mainWindow;
const ipc = electron.ipcMain;
const MongoClient = require('mongodb').MongoClient;
var teacherID = null;
var questions = new Set();
var classCode = null;
var uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
var addStatus = true;

app.on('ready', function () {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(url.format({ 
        pathname: '/public/html/login.html',//'/index.html',
        protocol: 'file:',
        slashes: true,
    }));

    mainWindow.webContents.openDevTools()

});


ipc.on('login_data', async function (event, value) {
    event.preventDefault();
    await verifyTeacher(value).then((data) => {
        console.log(data);
        if (data === true) {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/dashboard.html',
                protocol: 'file:',
                slashes: true,
            }));
        }
    });
});

ipc.on('getRoomCode', async function (event, value) {
    event.preventDefault();
    await getRoomCode().then((roomCode) => {
        console.log(roomCode);
        if (roomCode) {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/classcode.html',
                protocol: 'file:',
                slashes: true,
            })).then(() => {
                mainWindow.webContents.send('code', roomCode);
            });
        }
    });
});



ipc.on('deleteQuestion', async function (event, question) 
{
    addStatus = false;
    console.log("In the IPC DELETE");
    questions.delete(question);
    event.preventDefault();
    await deleteQuestion(question).then(() => {
        // setTimeout(()=>addStatus=true,5000);
        addStatus = true;
    });
});


async function deleteQuestion(question)
{
    console.log("BEGIN DELETE");

    return await MongoClient.connect(uri).then(async function (mongo) 
    {
        console.log('Connected...');

        const collection = mongo.db("edfusion").collection("classrooms");

        const query = {code:classCode};
        var doc = await getUpdatedDocument(collection,query, question);
        // console.log(doc);
        console.log(JSON.stringify(doc));
        var data = null;
        console.log("BEGIN REPLACE");

        collection.findOneAndReplace(
            query,
            doc

         ).catch((err)=>console.log(err))
         console.log("FINISHED REPLACE");


    }).catch(function (err) { })
}

async function getUpdatedDocument(collection,query, question)
{
    console.log("TRYING TO UPDATE");

    return await collection.find(query).toArray().then(items => 
    {
        var items2 = items;
        var questionsArr = items2[0].questions;
        console.log(questionsArr);
        questionsArr = questionsArr.filter(q => q.question != question);
        items2[0].questions = questionsArr;
        console.log(items2[0].questions);
        console.log(questionsArr);


        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))
}


ipc.on('startClass', async function (event, value) {
    event.preventDefault();
    mainWindow.loadURL(url.format({
        pathname: '/public/html/classroom.html',
        protocol: 'file:',
        slashes: true,
    })).then(()=>
    {
        console.log("CHANGED SCREEN")
        MongoClient.connect(uri).then(function (mongo) 
        {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("classrooms");
            const changeStream = collection.watch();
            
            changeStream.on('change',function(change)
            {
                if(addStatus)
                {
                    // console.log(change);
                    var questionsArr = null;
                    // if(change.fullDocument)
                        questionsArr = change.fullDocument.questions;
                    // else
                    //     questionsArr = change.updateDescription.updatedFields.questions;
                    if(questionsArr  && questionsArr.length>0)
                    {
                        // console.log(questionsArr);
                        var question = questionsArr[questionsArr.length-1].question;
                        if(!questions.has(question))
                            mainWindow.webContents.send('newQuestion', question);
                    }
                }
                
            });

        }).catch(function (err) {
            console.log("ERROR"+ err)
        })

    });

   
});

async function verifyTeacher(value) {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("teachers");

            const query = { email: value[0], password: value[1] };
            var data = null;
            return await collection.find(query).toArray().then(items => {
                console.log(items.length);
                if (items.length > 0)
                    data = true;
                else
                    data = false;
                teacherID = items[0]._id;
                return data;
            }).catch(err => console.error(`Failed to find documents: ${err}`))


        }).catch(function (err) { })

}
async function getRoomCode() {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("classrooms");
            collection.deleteMany({});

            const query = {};
            return await collection.find(query).toArray().then(async (items) => {
                var codes = new Set();
                items.forEach((item) => {
                    codes.add(item.code)
                })
                // codes.forEach((code)=>console.log(code));
                var num = Math.floor((Math.random() * 999999) + 1);
                while (codes.has(num) === true)
                    num = Math.floor((Math.random() * 999999) + 1);
                classCode = num;

                await collection.insertOne
                    (
                        {
                            "code": num,
                            "teacherID": teacherID,
                            "students": [],
                            "questions": [],
                            "ratings": []
                        }
                    );

                return num;
            }).catch(err => console.error(`Failed to find documents: ${err}`))


        }).catch(function (err) { })

}
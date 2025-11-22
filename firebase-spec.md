# plan

now we will work with index.html this will be the version where we will store data not in events.json but in firebase

therefore don't touch custom.html at all - that version should still operate on events.json

Now, I need to store what we currently are storing in events.json in firebase

Figure out the how to store the data in firebase.
Especially focus on what our server.js is doing.

From now on we will have to use not fetch but firebase api to fetch and save the data

And by the way, don't touch server.js at all too

Since we are using ESM in index.html

then let's introduce very early in main script await with promise which will handle user logging to firebase.

and only then we will continue with rest of the app after that promise is resolved

that promise should expose all what we need to use firebase.
Based on these tools we will have to modify rest of the the app code below that promise.


I would like all who visit this app to login his google account and I'm gonna have to somehow assist user to configure all what is needed to use firebase

I'm not sure at this point if this can be streamlined easily or I will have to guide user through this process and do some manual steps like creating project in firebase console and downloading config.json file if we could store it maybe in localStorage or something.


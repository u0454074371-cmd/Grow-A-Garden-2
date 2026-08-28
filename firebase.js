
const CONFIG=Object.freeze({
 apiKey:"AIzaSyCV0mhi6cL18kNA6ITBFiK1B7K9xNzUh8E",
 authDomain:"game-gag2-online.firebaseapp.com",
 projectId:"game-gag2-online",
 storageBucket:"game-gag2-online.firebasestorage.app",
 messagingSenderId:"1074153081214",
 appId:"1:1074153081214:web:a7487e92a2054e5b354b2f",
 measurementId:"G-P6XNGW6W9C",
 databaseURL:"https://game-gag2-online-default-rtdb.europe-west1.firebasedatabase.app"
});
let db=null,online=false;
export function getFirebaseConfig(){return {...CONFIG};}
export function firebaseIsOnline(){return online;}
export async function connectFirebase(){
 try{
  const appmod=await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  const dbmod=await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
  const app=appmod.initializeApp(CONFIG);
  db=dbmod.getDatabase(app);
  online=true;
  return true;
 }catch(error){
  console.warn("Firebase offline:",error);
  online=false;
  return false;
 }
}
export async function loadRemotePlayer(id){
 if(!online)return null;
 try{const {ref,get}=await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");const s=await get(ref(db,`players/${id}`));return s.exists()?s.val():null;}catch{return null;}
}
export async function saveRemote(id,data){
 if(!online)return false;
 try{const {ref,set}=await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");await set(ref(db,`players/${id}`),{...data,updatedAt:Date.now()});return true;}catch{return false;}
}

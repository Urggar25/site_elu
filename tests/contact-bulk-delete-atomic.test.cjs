// Run: node tests/contact-bulk-delete-atomic.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
const php=fs.readFileSync(path.join(__dirname,"../api/admin.php"),"utf8");
const begin=app.indexOf("let contactDeletionBusy = false;");
const end=app.indexOf("function contactExportRows()",begin);
assert.ok(begin>=0&&end>begin);
const deleteCode=app.slice(begin,end);
async function scenario(backendSuccess, expectedDeleted=2){
  const contacts=[{id:"A",entityType:"person"},{id:"B",entityType:"person"},{id:"INSTITUTION",entityType:"institution"}];
  const adminState={localContacts:contacts.map(c=>({...c}))};
  let apiCalls=0;
  let clientCountWhenServerCalled=0;
  let submittedIds=null;
  let toast="";
  const context={
    adminState,contactDeletionProgress:null,adminSyncStatus:"synced",adminSyncMessage:"",activeAdminSection:"contacts",
    stateSyncChannel:null,selectedContactId:"A",
    showToast:message=>toast=message,
    renderAdmin:()=>{},nextFrame:async()=>{},updateContactDeletionProgressDom:()=>{},
    clearDeletedContactReferences:()=>{},clearContactSelection:()=>{},resetContactLookupCaches:()=>{},addActivity:()=>{},
    loadAdminStateFromApi:async()=>{},
    adminApiRequest:async(method,payload)=>{
      apiCalls++;
      assert.equal(method,"POST");
      clientCountWhenServerCalled=adminState.localContacts.length;
      submittedIds=payload.deleteContactIds;
      assert.equal(payload.state,undefined,"Deleting must not upload the entire client contact database");
      assert.equal(payload.changes,undefined);
      if(!backendSuccess)throw new Error("database failure");
      return {ok:true,verified:true,deleted:submittedIds.length,remaining:contacts.length-submittedIds.length};
    }
  };
  const handler=new Function(...Object.keys(context),deleteCode+"; return deleteContactsByMatcherWithProgress")(...Object.values(context));
  const ok=await handler(contact=>contact.id==="A"||contact.id==="B",expectedDeleted,"test",new Set(["A","B"]));
  return {ok,apiCalls,clientCountWhenServerCalled,submittedIds,remaining:adminState.localContacts.map(c=>c.id),toast};
}
(async()=>{
 const success=await scenario(true);
 assert.equal(success.ok,true);
 assert.equal(success.clientCountWhenServerCalled,3,"Contacts cannot disappear before database acknowledgement");
 assert.deepEqual(success.submittedIds,["A","B"]);
 assert.deepEqual(success.remaining,["INSTITUTION"]);
 assert.match(success.toast,/confirmés par le serveur/);
 const failure=await scenario(false);
 assert.equal(failure.ok,false);
 assert.equal(failure.clientCountWhenServerCalled,3);
 assert.deepEqual(failure.remaining,["A","B","INSTITUTION"],"Database failure must leave contact state unchanged");
 assert.match(failure.toast,/non confirmée/);
 assert.match(php,/function delete_admin_contacts_by_ids\(/);
 assert.match(php,/SELECT state_json FROM admin_state WHERE id = 1 FOR UPDATE/);
 assert.match(php,/JSON_LENGTH\(JSON_EXTRACT\(state_json/);
 assert.match(php,/if \(count\(\$found\) !== count\(\$ids\)\)/);
 assert.match(php,/\$database->commit\(\)/);
 assert.match(php,/\$database->rollBack\(\)/);
 assert.match(php,/if \(\$deleteContactIds !== null\)/);
 console.log("Atomic bulk deletion: success, rollback UI, exact IDs and server verification OK");
})().catch(error=>{console.error(error);process.exitCode=1;});

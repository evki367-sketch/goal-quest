import { useState, useEffect, useRef } from "react";
import { Sword, Trophy, Target, ShoppingBag, Plus, Check, Trash2, Flame, Star, Zap, Gift, Coffee, Music, Gamepad2, Pizza, BookOpen, Sparkles, User, TrendingUp, Pencil, Clock, AlertTriangle, Calendar, Users, Crown, LogOut, Copy, UserPlus, X, UserCheck, Shield, Gem, Send, ThumbsUp, ThumbsDown, MessageCircle, Vote, Image as ImageIcon, Bookmark, Tag, Bell } from "lucide-react";

const STORAGE_KEY = "goalquest:state";

// Polyfill: replaces Claude's window.storage with localStorage for browser deployment
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (key) => { const v = localStorage.getItem(key); return v ? { value: v } : null; },
    set: async (key, value) => { localStorage.setItem(key, value); return { key, value }; },
    delete: async (key) => { localStorage.removeItem(key); return { key, deleted: true }; },
    list: async (prefix) => { const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!prefix || k.startsWith(prefix)) keys.push(k); } return { keys }; },
  };
}
const todayKey = () => new Date().toISOString().slice(0, 10);
const weekKey = () => { const d = new Date(), oj = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + "-W" + Math.ceil((((d - oj) / 86400000) + oj.getDay() + 1) / 7); };
const monthKey = () => new Date().toISOString().slice(0, 7);
const periodKey = p => p === "weekly" ? weekKey() : p === "monthly" ? monthKey() : todayKey();
const xpForLevel = l => 100 + (l - 1) * 50;
const XP_BY_DIFF = { chore: 0, easy: 25, medium: 50, hard: 100, epic: 200, legendary: 350, mythic: 600 };
const DIFF_ORDER = ["chore","easy","medium","hard","epic","legendary","mythic"];
const DIFF_COLOR = { chore:"bg-slate-500", easy:"bg-emerald-500", medium:"bg-sky-500", hard:"bg-purple-500", epic:"bg-amber-500", legendary:"bg-orange-500", mythic:"bg-gradient-to-r from-pink-500 to-red-500" };
const CATEGORIES = [{id:"work",l:"Work",emoji:"💼"},{id:"fitness",l:"Fitness",emoji:"💪"},{id:"learning",l:"Learning",emoji:"📚"},{id:"chores",l:"Chores",emoji:"🧹"},{id:"social",l:"Social",emoji:"💬"},{id:"health",l:"Health",emoji:"❤️"},{id:"creative",l:"Creative",emoji:"🎨"},{id:"other",l:"Other",emoji:"📝"}];
const LIMITS = { HARD_PER_DAY:3, EPIC_PER_DAY:2, LEGENDARY_PER_DAY:1, MYTHIC_PER_DAY:1, MIN_QUEST_AGE_SEC:30, LEAGUE_QUESTS_PER_USER:2, LEAGUE_QUESTS_TOTAL:20, CHAT_BURST_SEC:30, CHAT_BURST_MAX:10 };
const DEADLINE_OPTS = [{v:0,l:"No deadline"},{v:1,l:"1 hour"},{v:24,l:"1 day"},{v:72,l:"3 days"},{v:168,l:"1 week"},{v:-1,l:"Custom…"}];
const MILESTONES = [{level:10,id:"bronze_badge",name:"Bronze Badge",emoji:"🥉",color:"#CD7F32"},{level:25,id:"silver_badge",name:"Silver Badge",emoji:"🥈",color:"#C0C0C0"},{level:50,id:"gold_badge",name:"Gold Badge",emoji:"🥇",color:"#FFD700"},{level:100,id:"bronze_crown",name:"Bronze Crown",emoji:"👑",color:"#CD7F32"},{level:200,id:"silver_crown",name:"Silver Crown",emoji:"👑",color:"#E5E4E2"},{level:300,id:"gold_crown",name:"Gold Crown",emoji:"👑",color:"#FFD700"},{level:500,id:"flame_halo",name:"Flame Halo",emoji:"🔥",color:"#FF6B35"},{level:750,id:"diamond_mark",name:"Diamond Mark",emoji:"💎",color:"#B9F2FF"},{level:1000,id:"mythic_aura",name:"Mythic Aura",emoji:"✨",color:"#FF00FF"}];
const PLACEMENTS = {1:{name:"Champion",emoji:"🏆",color:"#FFD700"},2:{name:"Runner-up",emoji:"🥈",color:"#C0C0C0"},3:{name:"Bronze",emoji:"🥉",color:"#CD7F32"}};
const ICONS = { coffee:Coffee, music:Music, gamepad:Gamepad2, pizza:Pizza, book:BookOpen, gift:Gift, zap:Zap, clock:Clock, flame:Flame, shield:Shield, check:Check, gem:Gem };
const DEFAULT_SHOP = [
  {id:"s1",name:"Coffee Break",cost:50,icon:"coffee",desc:"Guilt-free café run",category:"reward"},{id:"s2",name:"Episode of a Show",cost:100,icon:"music",desc:"30 min of chill",category:"reward"},
  {id:"s3",name:"Gaming Session",cost:200,icon:"gamepad",desc:"1 hour of play",category:"reward"},{id:"s4",name:"Takeout Night",cost:400,icon:"pizza",desc:"No cooking tonight",category:"reward"},
  {id:"s5",name:"New Book",cost:600,icon:"book",desc:"Buy that book",category:"reward"},{id:"s6",name:"Big Reward",cost:1500,icon:"gift",desc:"Something you've been wanting",category:"reward"},
  {id:"b1",name:"XP Boost 1.5x",cost:250,icon:"zap",desc:"1.5× XP for 1 hour",category:"boost",boostMult:1.5,boostDurationMin:60},
  {id:"b2",name:"XP Boost 2x",cost:500,icon:"zap",desc:"2× XP for 30 min",category:"boost",boostMult:2,boostDurationMin:30},
  {id:"b3",name:"Mega Boost 3x",cost:1200,icon:"zap",desc:"3× XP for 15 min",category:"boost",boostMult:3,boostDurationMin:15},
  {id:"c1",name:"Deadline +1 Day",cost:150,icon:"clock",desc:"Push any quest deadline +24h",category:"consumable",effect:"extend",hours:24},
  {id:"c2",name:"Deadline +3 Days",cost:350,icon:"clock",desc:"Push any quest deadline +72h",category:"consumable",effect:"extend",hours:72},
  {id:"c3",name:"Streak Saver",cost:300,icon:"flame",desc:"Protects your streak for 1 missed day",category:"consumable",effect:"streakSave"},
  {id:"c4",name:"Failure Insurance",cost:400,icon:"shield",desc:"Next failed quest costs 0 XP",category:"consumable",effect:"failInsurance"},
  {id:"c5",name:"Quest Skip",cost:800,icon:"check",desc:"Auto-complete any quest",category:"consumable",effect:"skip"},
  {id:"c6",name:"Mythic Re-roll",cost:1000,icon:"gem",desc:"Refunds today's Mythic limit",category:"consumable",effect:"mythicReroll"},
];
const DEFAULT_DAILIES = [{id:"d1",name:"30 min exercise",xp:40,period:"daily"},{id:"d2",name:"Drink 8 glasses water",xp:20,period:"daily"},{id:"d3",name:"10 min meditation",xp:25,period:"daily"},{id:"w1",name:"Meal prep",xp:150,period:"weekly"},{id:"w2",name:"Deep clean",xp:200,period:"weekly"},{id:"m1",name:"Review monthly budget",xp:300,period:"monthly"}];

// ===================== NOTIFICATIONS =====================
const sendNotif = (title, body) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/icon-192.png" }); } catch (e) {}
};

function Avatar({name,equipped,championBadges,size=40,onClick}){
  const ms=equipped?.milestone?MILESTONES.find(m=>m.id===equipped.milestone):null;
  const badge=equipped?.badge&&championBadges?championBadges.find(b=>`${b.leagueCode}:${b.monthKey}`===equipped.badge):null;
  const pl=badge?PLACEMENTS[badge.placement]:null;
  return(<button onClick={onClick} disabled={!onClick} className={`relative rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold shrink-0 ${onClick?"hover:ring-2 hover:ring-indigo-400 cursor-pointer":"cursor-default"}`} style={{width:size,height:size,fontSize:size<32?12:size<44?14:18}}>
    {(name||"?").charAt(0).toUpperCase()}
    {ms&&<span className="absolute -top-1 -right-1 leading-none" style={{fontSize:Math.round(size*0.45),filter:`drop-shadow(0 0 2px ${ms.color})`}}>{ms.emoji}</span>}
    {pl&&<span className="absolute -bottom-1 -right-1 leading-none" style={{fontSize:Math.round(size*0.35)}}>{pl.emoji}</span>}
  </button>);
}

function GoalQuestApp({authedUser,onSignOut}){
  const[loaded,setLoaded]=useState(false);const[tab,setTab]=useState("quests");
  const[xp,setXp]=useState(0);const[gold,setGold]=useState(0);const[level,setLevel]=useState(1);
  const[streak,setStreak]=useState(0);const[lastDaily,setLastDaily]=useState(null);
  const[quests,setQuests]=useState([]);const[dailies,setDailies]=useState(DEFAULT_DAILIES);
  const[dailyDone,setDailyDone]=useState({});const[shop,setShop]=useState(DEFAULT_SHOP);const[inventory,setInventory]=useState([]);
  const[newQuest,setNewQuest]=useState({name:"",difficulty:"medium",deadlineHours:0,customAmount:"",customUnit:"hours",category:"other"});
  const[newDaily,setNewDaily]=useState({name:"",xp:20,period:"daily"});const[newShop,setNewShop]=useState({name:"",cost:100});
  const[flash,setFlash]=useState(null);const[now,setNow]=useState(Date.now());const[dailySubTab,setDailySubTab]=useState("daily");
  const[profile,setProfile]=useState({name:authedUser?.name||"Hero",className:"Adventurer",bio:"On a quest to level up real life."});
  const[stats,setStats]=useState([{id:"a",label:"Weight",value:"",unit:"lbs"},{id:"b",label:"Height",value:"",unit:"in"},{id:"c",label:"GPA",value:"",unit:""}]);
  const[newStat,setNewStat]=useState({label:"",unit:""});const[history,setHistory]=useState([]);const[editProf,setEditProf]=useState(false);
  const[league,setLeague]=useState(null);const[leagueData,setLeagueData]=useState(null);
  const[joinCode,setJoinCode]=useState("");const[newLeagueName,setNewLeagueName]=useState("");
  const[newLeagueQuest,setNewLeagueQuest]=useState({name:""});const[leagueSubTab,setLeagueSubTab]=useState("board");
  const[chatText,setChatText]=useState("");const[myVote,setMyVote]=useState({});const chatEndRef=useRef(null);
  const userId=authedUser?.uid||"anon";
  const USER_KEY = "goalquest:state:" + userId;
  const[friends,setFriends]=useState([]);const[incomingReqs,setIncomingReqs]=useState([]);
  const[outgoingReqs,setOutgoingReqs]=useState([]);const[friendSearch,setFriendSearch]=useState("");
  const[viewingProfile,setViewingProfile]=useState(null);const[profileModalData,setProfileModalData]=useState(null);
  const[notifPerm,setNotifPerm]=useState(typeof window!=="undefined"&&"Notification"in window?Notification.permission:"default");
  const[notifPrefs,setNotifPrefs]=useState({deadlines:true,dailyReminder:true,streakReminder:true});
  const[notifiedIds,setNotifiedIds]=useState(new Set());
  const[inAppNotifs,setInAppNotifs]=useState([]);
  const[showNotifPanel,setShowNotifPanel]=useState(false);
  const[unlocked,setUnlocked]=useState([]);const[equipped,setEquipped]=useState({milestone:null,badge:null});const[championBadges,setChampionBadges]=useState([]);
  const[actionLog,setActionLog]=useState([]);const[activeBoost,setActiveBoost]=useState(null);
  const[activeEffects,setActiveEffects]=useState({failInsurance:0,streakSaver:0});
  const[shopCat,setShopCat]=useState("all");const[pickingItem,setPickingItem]=useState(null);
  const[templates,setTemplates]=useState([]);const[dragIdx,setDragIdx]=useState(null);const[dragOverIdx,setDragOverIdx]=useState(null);

  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(leagueSubTab==="chat"&&chatEndRef.current)chatEndRef.current.scrollIntoView({behavior:"smooth"});},[leagueData?.messages,leagueSubTab]);

  useEffect(()=>{(async()=>{try{const r=await window.storage.get(USER_KEY);if(r){const s=JSON.parse(r.value);
    setXp(s.xp||0);setGold(s.gold||0);setLevel(s.level||1);setStreak(s.streak||0);setLastDaily(s.lastDaily||null);
    setQuests(s.quests||[]);setDailies(s.dailies||DEFAULT_DAILIES);setDailyDone(s.dailyDone||{});
    const sv=s.shop||[];const si=new Set(sv.map(x=>x.id));const miss=DEFAULT_SHOP.filter(d=>!si.has(d.id));
    setShop(miss.length>0?[...sv,...miss]:sv.length>0?sv:DEFAULT_SHOP);
    setInventory(s.inventory||[]);setProfile(s.profile||profile);setStats(s.stats||stats);setHistory(s.history||[]);
    setLeague(s.league||null);setFriends(s.friends||[]);setOutgoingReqs(s.outgoingReqs||[]);
    setUnlocked(s.unlocked||[]);setEquipped(s.equipped||{milestone:null,badge:null});setChampionBadges(s.championBadges||[]);
    setActionLog(s.actionLog||[]);setActiveBoost(s.activeBoost&&s.activeBoost.expiresAt>Date.now()?s.activeBoost:null);
    setActiveEffects(s.activeEffects||{failInsurance:0,streakSaver:0});setTemplates(s.templates||[]);
  }}catch(e){}setLoaded(true);})();},[]);

  useEffect(()=>{if(!loaded)return;const state={xp,gold,level,streak,lastDaily,quests,dailies,dailyDone,shop,inventory,profile,stats,history,league,friends,outgoingReqs,unlocked,equipped,championBadges,actionLog,activeBoost,activeEffects,templates};
    window.storage.set(USER_KEY,JSON.stringify(state)).catch(()=>{});},[loaded,xp,gold,level,streak,lastDaily,quests,dailies,dailyDone,shop,inventory,profile,stats,history,league,friends,outgoingReqs,unlocked,equipped,championBadges,actionLog,activeBoost,activeEffects,templates]);

  const showFlash=m=>{setFlash(m);setTimeout(()=>setFlash(null),2500);};
  const pushNotif=(title,body)=>{
    setInAppNotifs(n=>[{id:Date.now().toString(),title,body,time:Date.now(),read:false},...n].slice(0,50));
    sendNotif(title,body);
  };
  const requestNotifPerm=async()=>{if(typeof window==="undefined"||!("Notification"in window)){showFlash("Notifications not supported");return;}
    const p=await Notification.requestPermission();setNotifPerm(p);if(p==="granted")showFlash("Notifications enabled!");else showFlash("Permission denied");};
  const unreadCount=inAppNotifs.filter(n=>!n.read).length;
  const markAllRead=()=>setInAppNotifs(n=>n.map(x=>({...x,read:true})));

  // Deadline warning: notify 1 hour before deadline
  useEffect(()=>{if(!loaded||!notifPrefs.deadlines)return;
    const upcoming=quests.filter(q=>!q.done&&!q.failed&&q.deadline&&!notifiedIds.has(q.id));
    upcoming.forEach(q=>{const remaining=q.deadline-now;
      if(remaining>0&&remaining<3600000){setNotifiedIds(s=>{const n=new Set(s);n.add(q.id);return n;});
        pushNotif("⏰ Quest deadline approaching!",`"${q.name}" has less than 1 hour left!`);}});
  },[now,loaded]);

  // Daily reminder: check if dailies aren't done by 8pm
  useEffect(()=>{if(!loaded||!notifPrefs.dailyReminder)return;
    const h=new Date().getHours();const today=todayKey();
    if(h>=20&&h<21){const undone=dailies.filter(d=>d.period==="daily"&&dailyDone[d.id]!==today);
      if(undone.length>0&&!notifiedIds.has("daily_"+today)){setNotifiedIds(s=>{const n=new Set(s);n.add("daily_"+today);return n;});
        pushNotif("📋 Daily quests waiting!",`You have ${undone.length} daily quest${undone.length>1?"s":""} left today.`);}}
  },[now,loaded]);

  // Streak reminder: if it's past 9pm and all dailies aren't done, warn about streak
  useEffect(()=>{if(!loaded||!notifPrefs.streakReminder||streak<2)return;
    const h=new Date().getHours();const today=todayKey();
    if(h>=21&&h<22){const td=dailies.filter(d=>d.period==="daily");const allDone=td.every(d=>dailyDone[d.id]===today);
      if(!allDone&&!notifiedIds.has("streak_"+today)){setNotifiedIds(s=>{const n=new Set(s);n.add("streak_"+today);return n;});
        pushNotif("🔥 Your streak is at risk!",`${streak}-day streak will break if you don't finish your dailies!`);}}
  },[now,loaded]);
  const logAction=(type,meta)=>setActionLog(log=>[...log.slice(-200),{type,ts:Date.now(),meta}]);
  const countToday=(type,fn)=>{const s=new Date();s.setHours(0,0,0,0);return actionLog.filter(a=>a.type===type&&a.ts>=s.getTime()&&(!fn||fn(a))).length;};

  const awardXp=amount=>{let actual=amount;if(activeBoost&&activeBoost.expiresAt>Date.now())actual=Math.round(amount*activeBoost.mult);
    const gg=Math.floor(actual/2);let nx=xp+actual,nl=level;while(nx>=xpForLevel(nl)){nx-=xpForLevel(nl);nl++;showFlash(`🎉 LEVEL UP! Now level ${nl}`);pushNotif("🎉 Level Up!",`You reached level ${nl}!`);}
    setXp(nx);setLevel(nl);setGold(gold+gg);setHistory(h=>[...h.slice(-49),{date:new Date().toISOString(),level:nl,xp:nx,gold:gold+gg,gain:actual}]);
    if(!flash){const bn=(activeBoost&&activeBoost.expiresAt>Date.now())?` (${activeBoost.mult}× boost!)`:"";showFlash(`+${actual} XP, +${gg}g${bn}`);}};
  const penalizeXp=amount=>{if(activeEffects.failInsurance>0){setActiveEffects(e=>({...e,failInsurance:e.failInsurance-1}));showFlash(`🛡️ Insurance saved ${amount} XP!`);return;}
    let nx=xp-amount,nl=level;while(nx<0&&nl>1){nl--;nx+=xpForLevel(nl);}if(nx<0)nx=0;setXp(nx);setLevel(nl);
    setHistory(h=>[...h.slice(-49),{date:new Date().toISOString(),level:nl,xp:nx,gold,gain:-amount}]);};

  useEffect(()=>{if(!loaded)return;const nu=MILESTONES.filter(m=>level>=m.level&&!unlocked.includes(m.id));if(!nu.length)return;
    setUnlocked([...unlocked,...nu.map(m=>m.id)]);const best=nu[nu.length-1];setEquipped(eq=>({...eq,milestone:best.id}));
    setTimeout(()=>showFlash(`🎁 Unlocked: ${best.name}!`),800);},[level,loaded]);
  useEffect(()=>{if(!loaded)return;const exp=quests.filter(q=>!q.done&&!q.failed&&q.deadline&&q.deadline<=now);if(!exp.length)return;
    setQuests(qs=>qs.map(q=>exp.find(e=>e.id===q.id)?{...q,failed:true}:q));const lost=exp.reduce((s,q)=>s+q.xp,0);penalizeXp(lost);
    showFlash(`💀 Failed ${exp.length} quest! -${lost} XP`);pushNotif("💀 Quest failed!",`Lost ${lost} XP from ${exp.length} expired quest${exp.length>1?"s":""}`);},[now,loaded]);

  const checkLimit=d=>{if(d==="hard"&&countToday("qc",a=>a.meta?.d==="hard")>=LIMITS.HARD_PER_DAY)return`Daily: ${LIMITS.HARD_PER_DAY} Hard max`;
    if(d==="epic"&&countToday("qc",a=>a.meta?.d==="epic")>=LIMITS.EPIC_PER_DAY)return`Daily: ${LIMITS.EPIC_PER_DAY} Epic max`;
    if(d==="legendary"&&countToday("qc",a=>a.meta?.d==="legendary")>=LIMITS.LEGENDARY_PER_DAY)return"1 Legendary/day";
    if(d==="mythic"&&countToday("qc",a=>a.meta?.d==="mythic")>=LIMITS.MYTHIC_PER_DAY)return"1 Mythic/day";return null;};
  const addQuest=()=>{if(!newQuest.name.trim())return;const le=checkLimit(newQuest.difficulty);if(le){showFlash(le);return;}
    let hrs=Number(newQuest.deadlineHours)||0;if(newQuest.deadlineHours==="custom"){const a=Number(newQuest.customAmount)||0;hrs=newQuest.customUnit==="days"?a*24:a;}
    const dl=hrs>0?Date.now()+hrs*3600000:null;const ct=Date.now();
    setQuests([...quests,{id:ct.toString(),name:newQuest.name,xp:XP_BY_DIFF[newQuest.difficulty],difficulty:newQuest.difficulty,category:newQuest.category,done:false,deadline:dl,failed:false,createdAt:ct}]);
    logAction("qc",{d:newQuest.difficulty});setNewQuest({name:"",difficulty:"medium",deadlineHours:0,customAmount:"",customUnit:"hours",category:"other"});};
  const completeQuest=id=>{const q=quests.find(x=>x.id===id);if(!q||q.done)return;
    if(q.createdAt&&q.difficulty!=="chore"){const age=(Date.now()-q.createdAt)/1000;if(age<LIMITS.MIN_QUEST_AGE_SEC){showFlash(`Wait ${Math.ceil(LIMITS.MIN_QUEST_AGE_SEC-age)}s`);return;}}
    if(q.xp>0)awardXp(q.xp);else showFlash(`✓ ${q.name}`);setQuests(quests.map(x=>x.id===id?{...x,done:true}:x));logAction("qd",{d:q.difficulty});};
  const delQuest=id=>setQuests(quests.filter(x=>x.id!==id));
  const saveTemplate=q=>setTemplates([...templates,{id:Date.now().toString(),name:q.name,difficulty:q.difficulty,category:q.category}]);
  const addFromTemplate=t=>setNewQuest({...newQuest,name:t.name,difficulty:t.difficulty,category:t.category});
  const completeDaily=id=>{const d=dailies.find(x=>x.id===id);if(!d)return;const k=periodKey(d.period);if(dailyDone[id]===k)return;awardXp(d.xp);
    const nd2={...dailyDone,[id]:k};setDailyDone(nd2);
    if(d.period==="daily"){const t=todayKey(),td=dailies.filter(x=>x.period==="daily"),yd=new Date(Date.now()-86400000).toISOString().slice(0,10),db=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
      if(td.every(x=>x.id===id?true:nd2[x.id]===t)&&lastDaily!==t){
        if(lastDaily===yd)setStreak(streak+1);else if(lastDaily===db&&activeEffects.streakSaver>0){setStreak(streak+1);setActiveEffects(e=>({...e,streakSaver:e.streakSaver-1}));showFlash("🔥 Streak Saver!");}else setStreak(1);
        setLastDaily(t);showFlash("🔥 Streak!");}}};
  const addDaily=()=>{if(!newDaily.name.trim())return;setDailies([...dailies,{id:Date.now().toString(),name:newDaily.name,xp:Number(newDaily.xp)||20,period:newDaily.period}]);setNewDaily({...newDaily,name:""});};
  const delDaily=id=>setDailies(dailies.filter(x=>x.id!==id));
  const buyItem=item=>{if(gold<item.cost){showFlash("Not enough gold!");return;}setGold(gold-item.cost);setInventory([...inventory,{...item,invId:Date.now().toString()}]);showFlash(`Got ${item.name}!`);};
  const useItem=invId=>{const item=inventory.find(x=>x.invId===invId);if(!item)return;
    if(item.category==="reward"||!item.category){setInventory(inventory.filter(x=>x.invId!==invId));showFlash(`Enjoy your ${item.name}!`);return;}
    if(item.category==="boost"){setActiveBoost({mult:item.boostMult,expiresAt:Date.now()+item.boostDurationMin*60000,name:item.name});setInventory(inventory.filter(x=>x.invId!==invId));showFlash(`⚡ ${item.name} active!`);return;}
    if(item.effect==="extend"||item.effect==="skip"){if(!quests.filter(q=>!q.done&&!q.failed).length){showFlash("No active quests!");return;}setPickingItem({invId,item});return;}
    if(item.effect==="streakSave"){setActiveEffects(e=>({...e,streakSaver:e.streakSaver+1}));setInventory(inventory.filter(x=>x.invId!==invId));showFlash("🔥 Streak Saver armed!");return;}
    if(item.effect==="failInsurance"){setActiveEffects(e=>({...e,failInsurance:e.failInsurance+1}));setInventory(inventory.filter(x=>x.invId!==invId));showFlash("🛡️ Insurance armed!");return;}
    if(item.effect==="mythicReroll"){const s=new Date();s.setHours(0,0,0,0);setActionLog(log=>log.filter(a=>!(a.type==="qc"&&a.meta?.d==="mythic"&&a.ts>=s.getTime())));setInventory(inventory.filter(x=>x.invId!==invId));showFlash("💎 Mythic refunded!");return;}};
  const applyItem=qid=>{if(!pickingItem)return;const{invId,item}=pickingItem;const q=quests.find(x=>x.id===qid);if(!q)return;
    if(item.effect==="extend"){setQuests(quests.map(x=>x.id===qid?{...x,deadline:(x.deadline||Date.now())+item.hours*3600000,failed:false}:x));showFlash(`⏰ Extended "${q.name}"`);}
    else if(item.effect==="skip"){setQuests(quests.map(x=>x.id===qid?{...x,done:true}:x));if(q.xp>0)awardXp(q.xp);showFlash(`✨ Skipped "${q.name}"`);}
    setInventory(inventory.filter(x=>x.invId!==invId));setPickingItem(null);};
  const addShopItem=()=>{if(!newShop.name.trim())return;setShop([...shop,{id:Date.now().toString(),name:newShop.name,cost:Number(newShop.cost)||100,icon:"gift",desc:"Custom reward",category:"reward",isCustom:true}]);setNewShop({name:"",cost:100});};
  const delShopItem=id=>setShop(shop.filter(x=>x.id!==id));

  const leagueKey=code=>`league:${code}`;
  const refreshLeague=async code=>{try{const r=await window.storage.get(leagueKey(code),true);if(r)setLeagueData(JSON.parse(r.value));}catch(e){}};
  useEffect(()=>{if(!league?.code){setLeagueData(null);return;}refreshLeague(league.code);if(tab!=="league")return;const t=setInterval(()=>refreshLeague(league.code),10000);return()=>clearInterval(t);},[league,tab]);
  const createLeague=async()=>{if(!newLeagueName.trim())return;const code=Math.random().toString(36).slice(2,7).toUpperCase();
    const data={code,name:newLeagueName,members:{[userId]:{name:profile.name,level,completed:0}},quests:[],polls:[],messages:[],completions:{},memberMonthly:{}};
    await window.storage.set(leagueKey(code),JSON.stringify(data),true);setLeague({code,name:newLeagueName});setLeagueData(data);setNewLeagueName("");showFlash(`Created! Code: ${code}`);};
  const joinLeague=async()=>{const code=joinCode.trim().toUpperCase();if(!code)return;try{const r=await window.storage.get(leagueKey(code),true);if(!r){showFlash("Not found");return;}
    const data=JSON.parse(r.value);data.members[userId]={name:profile.name,level,completed:0};await window.storage.set(leagueKey(code),JSON.stringify(data),true);
    setLeague({code,name:data.name});setLeagueData(data);setJoinCode("");showFlash(`Joined ${data.name}!`);}catch(e){showFlash("Error");}};
  const leaveLeague=async()=>{if(!league||!leagueData){setLeague(null);setLeagueData(null);return;}try{const data={...leagueData};delete data.members[userId];
    if(Object.keys(data.members).length===0)await window.storage.delete(leagueKey(league.code),true);else await window.storage.set(leagueKey(league.code),JSON.stringify(data),true);}catch(e){}setLeague(null);setLeagueData(null);};
  const proposeQuest=async()=>{if(!leagueData||!newLeagueQuest.name.trim())return;const ac=(leagueData.quests||[]).length+(leagueData.polls||[]).length;
    if(ac>=LIMITS.LEAGUE_QUESTS_TOTAL){showFlash("League full!");return;}const mine=[...(leagueData.quests||[]),...(leagueData.polls||[])].filter(x=>x.createdBy===userId).length;
    if(mine>=LIMITS.LEAGUE_QUESTS_PER_USER){showFlash("Max 2 active proposals");return;}const data={...leagueData};
    data.polls=[...(data.polls||[]),{id:Date.now().toString(),name:newLeagueQuest.name,createdBy:userId,createdAt:Date.now(),votes:{}}];
    await window.storage.set(leagueKey(league.code),JSON.stringify(data),true);setLeagueData(data);setNewLeagueQuest({name:""});logAction("pc");showFlash("Poll opened");};
  const castVote=async(pid,vote)=>{if(!leagueData)return;const data={...leagueData};const poll=data.polls.find(p=>p.id===pid);if(!poll)return;
    poll.votes={...poll.votes,[userId]:vote};const mc=Object.keys(data.members).length;const ap=Object.values(poll.votes).filter(v=>v.approve).length;
    if(ap>mc/2&&Object.keys(poll.votes).length>=Math.ceil(mc/2)){const diffs=Object.values(poll.votes).filter(v=>v.approve).map(v=>v.difficulty);const dc={};diffs.forEach(d=>dc[d]=(dc[d]||0)+1);
      const wd=Object.entries(dc).sort((a,b)=>b[1]-a[1])[0][0];const deads=Object.values(poll.votes).filter(v=>v.approve).map(v=>+v.deadline).sort((a,b)=>a-b);const wdl=deads[Math.floor(deads.length/2)];
      data.quests=[...(data.quests||[]),{id:"lq"+Date.now(),name:poll.name,xp:XP_BY_DIFF[wd],difficulty:wd,deadline:wdl>0?Date.now()+wdl*3600000:null,createdBy:poll.createdBy}];
      data.polls=data.polls.filter(p=>p.id!==pid);showFlash(`Approved! ${wd.toUpperCase()}`);}
    await window.storage.set(leagueKey(league.code),JSON.stringify(data),true);setLeagueData(data);setMyVote(m=>({...m,[pid]:vote}));};
  const completeLQ=async qid=>{if(!leagueData)return;const q=leagueData.quests.find(x=>x.id===qid);if(!q)return;const c=leagueData.completions||{};if(c[qid]?.[userId]){showFlash("Already done!");return;}
    const data={...leagueData};data.completions={...c,[qid]:{...(c[qid]||{}),[userId]:Date.now()}};data.members[userId]={...data.members[userId],name:profile.name,level,completed:(data.members[userId]?.completed||0)+1,equipped};
    const mk=new Date().toISOString().slice(0,7);data.memberMonthly=data.memberMonthly||{};data.memberMonthly[mk]=data.memberMonthly[mk]||{};data.memberMonthly[mk][userId]=(data.memberMonthly[mk][userId]||0)+1;
    await window.storage.set(leagueKey(league.code),JSON.stringify(data),true);setLeagueData(data);awardXp(q.xp);};
  const sendMsg=async(text,photo)=>{if(!leagueData||(!text&&!photo))return;const recent=actionLog.filter(a=>a.type==="cs"&&Date.now()-a.ts<LIMITS.CHAT_BURST_SEC*1000).length;
    if(recent>=LIMITS.CHAT_BURST_MAX){showFlash("Slow down!");return;}const data={...leagueData};
    data.messages=[...(data.messages||[]),{id:Date.now().toString(),userId,userName:profile.name,text:text||"",photo:photo||null,timestamp:Date.now()}].slice(-100);
    await window.storage.set(leagueKey(league.code),JSON.stringify(data),true);setLeagueData(data);setChatText("");logAction("cs");};
  const handlePhoto=ev=>{const f=ev.target.files[0];if(!f)return;if(f.size>500000){showFlash("Max 500KB");return;}const r=new FileReader();r.onload=e2=>sendMsg(chatText,e2.target.result);r.readAsDataURL(f);ev.target.value="";};

  const myCode=userId==="anon"?"":userId.replace(/[^A-Z0-9]/gi,"").slice(0,6).toUpperCase();
  const pubKey=code=>`profilepub:${code}`;const reqKey=uid=>`friendreqs:${uid}`;
  useEffect(()=>{if(!loaded||!authedUser||!myCode)return;const snap={uid:userId,code:myCode,name:profile.name,className:profile.className,level,xp,streak,questsDone:quests.filter(q=>q.done).length,dailiesDone:Object.keys(dailyDone).length,equipped,championBadges:championBadges.slice(-3),updatedAt:Date.now()};
    window.storage.set(pubKey(myCode),JSON.stringify(snap),true).catch(()=>{});},[loaded,authedUser,myCode,profile,level,xp,streak,quests,dailyDone,equipped,championBadges]);
  const sendFR=async()=>{const code=friendSearch.trim().toUpperCase();if(!code||code===myCode){showFlash("Enter a friend code");return;}if(friends.find(f=>f.code===code)){showFlash("Already friends!");return;}
    try{const r=await window.storage.get(pubKey(code),true);if(!r){showFlash("Not found");return;}const target=JSON.parse(r.value);let reqs=[];try{const er=await window.storage.get(reqKey(target.uid),true);if(er)reqs=JSON.parse(er.value);}catch(e){}
      reqs.push({fromUid:userId,fromCode:myCode,fromName:profile.name,sentAt:Date.now()});await window.storage.set(reqKey(target.uid),JSON.stringify(reqs),true);
      setOutgoingReqs([...outgoingReqs,{toUid:target.uid,toCode:code,toName:target.name,sentAt:Date.now()}]);setFriendSearch("");showFlash(`Sent to ${target.name}!`);}catch(e){showFlash("Error");}};
  const acceptFR=async req=>{setFriends([...friends,{uid:req.fromUid,code:req.fromCode,name:req.fromName,addedAt:Date.now()}]);
    const rem=incomingReqs.filter(r=>r.fromUid!==req.fromUid);setIncomingReqs(rem);await window.storage.set(reqKey(userId),JSON.stringify(rem),true);showFlash(`${req.fromName} added!`);};
  const declineFR=async req=>{const rem=incomingReqs.filter(r=>r.fromUid!==req.fromUid);setIncomingReqs(rem);await window.storage.set(reqKey(userId),JSON.stringify(rem),true);};
  const removeFriend=uid=>{setFriends(friends.filter(f=>f.uid!==uid));showFlash("Removed");};

  useEffect(()=>{if(!viewingProfile){setProfileModalData(null);return;}if(viewingProfile===userId){setProfileModalData({uid:userId,name:profile.name,className:profile.className,level,xp,streak,questsDone:quests.filter(q=>q.done).length,dailiesDone:Object.keys(dailyDone).length,equipped,championBadges});return;}
    const code=friends.find(x=>x.uid===viewingProfile)?.code||viewingProfile.replace(/[^A-Z0-9]/gi,"").slice(0,6).toUpperCase();
    (async()=>{try{const r=await window.storage.get(pubKey(code),true);if(r)setProfileModalData(JSON.parse(r.value));else setProfileModalData({name:"unavailable",offline:true});}catch(e){setProfileModalData({name:"unavailable",offline:true});}})();},[viewingProfile]);

  const xpNeeded=xpForLevel(level),xpPct=Math.min(100,Math.round((xp/xpNeeded)*100)),tqd=quests.filter(q=>q.done).length;
  const fmtTime=ms=>{if(ms<=0)return"expired";const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sc=s%60;if(d)return d+"d "+h+"h";if(h)return h+"h "+m+"m";if(m)return m+"m "+sc+"s";return sc+"s";};
  const timeAgo=ts=>{const s=Math.floor((Date.now()-ts)/1000);if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";};

  if(!loaded)return <div className="p-8 text-center text-slate-400">Loading your quest log...</div>;

  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 font-sans">
      <div className="max-w-3xl mx-auto">
        {flash&&<div className="fixed top-4 right-4 bg-indigo-600 px-4 py-2 rounded-lg shadow-xl animate-pulse z-50 text-sm">{flash}</div>}
        <div className="bg-slate-800/60 backdrop-blur border border-indigo-500/30 rounded-xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Sword className="text-indigo-400" /><h1 className="text-2xl font-bold">Goal Quest</h1></div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-400" /> {streak}</div>
              <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {gold}g</div>
              <button onClick={()=>setShowNotifPanel(!showNotifPanel)} title="Notifications" className="text-slate-400 hover:text-indigo-400 relative">
                <Bell className="w-4 h-4"/>{unreadCount>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}
              </button>
              {onSignOut&&<button onClick={onSignOut} title="Sign out" className="text-slate-400 hover:text-red-400"><LogOut className="w-4 h-4" /></button>}
            </div></div>
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} equipped={equipped} championBadges={championBadges} size={48} />
            <div className="flex-1"><div className="flex justify-between text-xs mb-1"><span>Level {level}</span><span>{xp}/{xpNeeded} XP</span></div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{width:`${xpPct}%`}} /></div></div></div>
          {activeBoost&&activeBoost.expiresAt>now&&<div className="mt-2 text-xs text-amber-400">⚡ {activeBoost.name} — {Math.max(0,Math.ceil((activeBoost.expiresAt-now)/60000))}m left</div>}
          {activeEffects.failInsurance>0&&<div className="text-xs text-emerald-400">🛡️ Insurance ×{activeEffects.failInsurance}</div>}
          {activeEffects.streakSaver>0&&<div className="text-xs text-orange-400">🔥 Streak Saver ×{activeEffects.streakSaver}</div>}
        </div>
        {/* NOTIFICATION PANEL */}
        {showNotifPanel&&<div className="bg-slate-800/60 border border-slate-700 rounded-xl mb-4 overflow-hidden">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-400"/>Notifications</div>
            <div className="flex items-center gap-2">
              {unreadCount>0&&<button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>}
              <button onClick={()=>setShowNotifPanel(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
          </div>
          {/* Settings */}
          <div className="p-3 border-b border-slate-700 space-y-2">
            <div className="text-xs text-slate-400 mb-1">Settings</div>
            {notifPerm!=="granted"?<button onClick={requestNotifPerm} className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"><Bell className="w-4 h-4"/>Enable browser notifications</button>
            :<div className="text-xs text-emerald-400 mb-2">✓ Browser notifications enabled</div>}
            {[["deadlines","⏰ Deadline warnings (1hr before)"],["dailyReminder","📋 Daily reminder (8pm)"],["streakReminder","🔥 Streak at risk (9pm)"]].map(([key,label])=>
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={notifPrefs[key]} onChange={e=>setNotifPrefs({...notifPrefs,[key]:e.target.checked})} className="rounded"/>
                {label}
              </label>)}
          </div>
          {/* Feed */}
          <div className="max-h-64 overflow-y-auto">
            {inAppNotifs.length===0&&<div className="text-center text-slate-500 text-sm py-6">No notifications yet</div>}
            {inAppNotifs.map(n=><div key={n.id} className={`p-3 border-b border-slate-700/50 ${n.read?"opacity-50":""}`}
              onClick={()=>setInAppNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x))}>
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-slate-400">{n.body}</div>
              <div className="text-[10px] text-slate-500 mt-1">{new Date(n.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
            </div>)}
          </div>
        </div>}

        <div className="flex gap-2 mb-4 flex-wrap">{[["profile","Profile",User],["quests","Quests",Target],["daily","Recurring",Zap],["shop","Shop",ShoppingBag],["friends","Friends",UserPlus],["league","League",Users],["bag","Bag",Trophy]].map(([k,l,I])=>
          <button key={k} onClick={()=>setTab(k)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition ${tab===k?"bg-indigo-600 shadow-lg":"bg-slate-800/60 hover:bg-slate-700"}`}><I className="w-3 h-3"/>{l}{k==="friends"&&incomingReqs.length>0&&` (${incomingReqs.length})`}</button>)}</div>

        {tab==="profile"&&<div className="space-y-3">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-start gap-4"><Avatar name={profile.name} equipped={equipped} championBadges={championBadges} size={80}/><div className="flex-1 min-w-0">{editProf?<div className="space-y-2"><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Name" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><input value={profile.className} onChange={e=>setProfile({...profile,className:e.target.value})} placeholder="Class" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><input value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Bio" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><button onClick={()=>setEditProf(false)} className="bg-emerald-600 px-3 py-1 rounded text-sm">Save</button></div>:<><div className="flex items-center gap-2"><span className="text-xl font-bold">{profile.name}</span><button onClick={()=>setEditProf(true)} className="text-slate-400 hover:text-indigo-400"><Pencil className="w-4 h-4"/></button></div><div className="text-sm text-indigo-300">Lv {level} {profile.className}</div><div className="text-xs text-slate-400 italic mt-1">"{profile.bio}"</div></>}</div></div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="grid grid-cols-4 gap-2 text-center">{[["Level",level],["Streak",streak],["Quests",tqd],["Dailies",Object.keys(dailyDone).length]].map(([l,v])=><div key={l} className="bg-slate-900/40 rounded p-2"><div className="text-xl font-bold text-indigo-400">{v}</div><div className="text-xs text-slate-400">{l}</div></div>)}</div></div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><h3 className="font-bold mb-2 text-sm flex items-center gap-2"><Gem className="w-4 h-4 text-purple-400"/>Collection</h3><div className="grid grid-cols-3 gap-2">{MILESTONES.map(m=>{const ul=unlocked.includes(m.id),eq=equipped.milestone===m.id;return(<button key={m.id} onClick={()=>ul&&setEquipped(e=>({...e,milestone:eq?null:m.id}))} disabled={!ul} className={`p-2 rounded border text-center ${eq?"bg-indigo-600/40 border-indigo-400":ul?"bg-slate-900/60 border-slate-700 hover:border-indigo-500":"bg-slate-900/40 border-slate-800 opacity-40"}`}><div className="text-xl mb-1">{ul?m.emoji:"🔒"}</div><div className="text-[10px]">{m.name}</div></button>);})}</div></div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><h3 className="font-bold mb-2 text-sm">Stats</h3>{stats.map(s=><div key={s.id} className="flex gap-2 items-center mb-2"><span className="text-sm w-20">{s.label}</span><input value={s.value} onChange={e=>setStats(stats.map(x=>x.id===s.id?{...x,value:e.target.value}:x))} className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" placeholder="—"/><span className="text-xs text-slate-400 w-10">{s.unit}</span><button onClick={()=>setStats(stats.filter(x=>x.id!==s.id))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button></div>)}<div className="flex gap-2 mt-2 pt-2 border-t border-slate-700"><input value={newStat.label} onChange={e=>setNewStat({...newStat,label:e.target.value})} placeholder="Stat" className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><input value={newStat.unit} onChange={e=>setNewStat({...newStat,unit:e.target.value})} placeholder="Unit" className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><button onClick={()=>{if(!newStat.label.trim())return;setStats([...stats,{id:Date.now().toString(),label:newStat.label,unit:newStat.unit,value:""}]);setNewStat({label:"",unit:""});}}>+</button></div></div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><h3 className="font-bold mb-2 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400"/>Path</h3>{history.length===0?<div className="text-center text-slate-500 text-sm py-4">Complete quests to start.</div>:<><div className="flex items-end gap-1 h-16 mb-2">{history.slice(-20).map((h,i)=>{const mx=Math.max(...history.slice(-20).map(x=>Math.abs(x.gain||0)),1);return <div key={i} className="flex-1 rounded-t" style={{height:`${Math.max(10,(Math.abs(h.gain)/mx)*100)}%`,background:h.gain<0?"#ef4444":"#6366f1"}}/>;})}</div>{[...history].reverse().slice(0,5).map((h,i)=><div key={i} className="flex justify-between text-xs text-slate-400 py-1"><span>{new Date(h.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span><span className={h.gain<0?"text-red-400":"text-yellow-400"}>{h.gain>0?"+":""}{h.gain}xp</span></div>)}</>}</div>
        </div>}

        {tab==="quests"&&<div className="space-y-3">
          {templates.length>0&&<div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"><div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Bookmark className="w-3 h-3"/>Templates</div><div className="flex gap-2 flex-wrap">{templates.map(t=><button key={t.id} onClick={()=>addFromTemplate(t)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs hover:bg-indigo-600">{t.name}<span onClick={e=>{e.stopPropagation();setTemplates(templates.filter(x=>x.id!==t.id));}} className="ml-1 text-slate-500 hover:text-red-400">×</span></button>)}</div></div>}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"><div className="flex gap-2 flex-wrap"><input value={newQuest.name} onChange={e=>setNewQuest({...newQuest,name:e.target.value})} placeholder="New quest" className="flex-1 min-w-[150px] bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><select value={newQuest.difficulty} onChange={e=>setNewQuest({...newQuest,difficulty:e.target.value})} className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm">{DIFF_ORDER.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)} ({XP_BY_DIFF[d]}xp)</option>)}</select><select value={newQuest.category} onChange={e=>setNewQuest({...newQuest,category:e.target.value})} className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm">{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.l}</option>)}</select><select value={newQuest.deadlineHours} onChange={e=>setNewQuest({...newQuest,deadlineHours:e.target.value})} className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm">{DEADLINE_OPTS.map(d=><option key={d.v} value={d.v===-1?"custom":d.v}>{d.l}</option>)}</select><button onClick={addQuest} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded text-sm flex items-center gap-1"><Plus className="w-4 h-4"/>Add</button></div>{newQuest.deadlineHours==="custom"&&<div className="flex gap-2 mt-2 items-center"><span className="text-xs text-slate-400">Due in</span><input type="number" min="1" value={newQuest.customAmount} onChange={e=>setNewQuest({...newQuest,customAmount:e.target.value})} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"/><select value={newQuest.customUnit} onChange={e=>setNewQuest({...newQuest,customUnit:e.target.value})} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"><option value="hours">hours</option><option value="days">days</option></select></div>}</div>
          {quests.length>0&&<QuestActions onClearDone={()=>setQuests(quests.filter(q=>!q.done&&!q.failed))} onDeleteAll={()=>setQuests([])}/>}
          {quests.length===0&&<div className="text-center text-slate-500 py-8">No quests yet.</div>}
          {quests.map((q,idx)=>{const ms=q.deadline?q.deadline-now:null,urg=ms!==null&&ms>0&&ms<3600000,cat=CATEGORIES.find(c=>c.id===q.category);return(
            <div key={q.id} draggable={!q.done&&!q.failed} onDragStart={()=>setDragIdx(idx)} onDragOver={e=>{e.preventDefault();setDragOverIdx(idx);}} onDrop={e=>{e.preventDefault();if(dragIdx===null||dragIdx===idx){setDragIdx(null);setDragOverIdx(null);return;}const n=[...quests];const[m]=n.splice(dragIdx,1);n.splice(idx,0,m);setQuests(n);setDragIdx(null);setDragOverIdx(null);}} onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}} className={`border rounded-xl p-3 flex items-center gap-2 transition ${q.failed?"bg-red-950/40 border-red-700/50 opacity-70":q.done?"bg-slate-800/60 border-slate-700 opacity-50":urg?"bg-amber-950/40 border-amber-600/60 animate-pulse":"bg-slate-800/60 border-slate-700"} ${dragIdx===idx?"opacity-40":""} ${dragOverIdx===idx&&dragIdx!==idx?"ring-2 ring-indigo-400":""}`}>
              {!q.done&&!q.failed&&<span className="cursor-grab text-slate-500 text-lg px-1">⋮⋮</span>}
              <span className={`${DIFF_COLOR[q.difficulty]} text-xs px-2 py-0.5 rounded font-bold uppercase`}>{q.difficulty}</span>
              {cat&&<span className="text-xs">{cat.emoji}</span>}
              <div className="flex-1 min-w-0"><div className={q.done||q.failed?"line-through":""}>{q.name}</div>{q.deadline&&!q.done&&<div className={`text-xs flex items-center gap-1 ${q.failed?"text-red-400":urg?"text-amber-400":"text-slate-400"}`}>{q.failed?<AlertTriangle className="w-3 h-3"/>:<Clock className="w-3 h-3"/>}{q.failed?`Failed -${q.xp}xp`:fmtTime(ms)}</div>}</div>
              {q.difficulty!=="chore"&&<span className={`text-sm ${q.failed?"text-red-400":"text-yellow-400"}`}>{q.failed?"-":"+"}{q.xp}xp</span>}
              {!q.done&&!q.failed&&<button onClick={()=>completeQuest(q.id)} className="bg-emerald-600 hover:bg-emerald-500 p-1.5 rounded"><Check className="w-3 h-3"/></button>}
              {!q.done&&!q.failed&&<button onClick={()=>saveTemplate(q)} title="Save as template" className="text-slate-400 hover:text-indigo-400"><Bookmark className="w-3 h-3"/></button>}
              <button onClick={()=>delQuest(q.id)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
            </div>);})}
        </div>}

        {tab==="daily"&&<div className="space-y-3">
          <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg">{["daily","weekly","monthly"].map(p=><button key={p} onClick={()=>{setDailySubTab(p);setNewDaily({...newDaily,period:p});}} className={`flex-1 py-2 rounded-md text-sm font-medium capitalize ${dailySubTab===p?"bg-indigo-600":"hover:bg-slate-700"}`}>{p}</button>)}</div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex gap-2 flex-wrap"><input value={newDaily.name} onChange={e=>setNewDaily({...newDaily,name:e.target.value})} placeholder={`New ${dailySubTab}`} className="flex-1 min-w-[150px] bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><input type="number" value={newDaily.xp} onChange={e=>setNewDaily({...newDaily,xp:e.target.value})} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm" placeholder="XP"/><button onClick={addDaily} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded text-sm"><Plus className="w-4 h-4"/></button></div>
          {dailies.filter(d=>d.period===dailySubTab).map(d=>{const done=dailyDone[d.id]===periodKey(d.period);return(<div key={d.id} className={`bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3 ${done?"opacity-50":""}`}><Zap className={`w-5 h-5 ${done?"text-emerald-400":"text-amber-400"}`}/><span className={`flex-1 ${done?"line-through":""}`}>{d.name}</span><span className="text-yellow-400 text-sm">+{d.xp}xp</span>{!done&&<button onClick={()=>completeDaily(d.id)} className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded"><Check className="w-4 h-4"/></button>}<button onClick={()=>delDaily(d.id)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></div>);})}
        </div>}

        {tab==="shop"&&<div className="space-y-3">
          <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg">{[["all","All"],["boost","Boosts ⚡"],["consumable","Items 🎁"],["reward","Rewards 🏆"]].map(([k,l])=><button key={k} onClick={()=>setShopCat(k)} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${shopCat===k?"bg-indigo-600":"hover:bg-slate-700"}`}>{l}</button>)}</div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex gap-2 flex-wrap"><input value={newShop.name} onChange={e=>setNewShop({...newShop,name:e.target.value})} placeholder="Custom reward" className="flex-1 min-w-[150px] bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><input type="number" value={newShop.cost} onChange={e=>setNewShop({...newShop,cost:e.target.value})} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm" placeholder="Cost"/><button onClick={addShopItem} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded text-sm"><Plus className="w-4 h-4"/></button></div>
          <div className="grid grid-cols-2 gap-3">{shop.filter(i=>shopCat==="all"||(i.category||"reward")===shopCat).map(item=>{const Icon=ICONS[item.icon]||Gift;const ca=gold>=item.cost;const cat=item.category||"reward";const clr={boost:"from-amber-900/40 to-orange-900/40 border-amber-500/40",consumable:"from-purple-900/40 to-pink-900/40 border-purple-500/40",reward:"from-slate-800/60 to-slate-800/60 border-slate-700"};return(<div key={item.id} className={`bg-gradient-to-br ${clr[cat]} border rounded-xl p-3 relative`}>{item.isCustom&&<button onClick={()=>delShopItem(item.id)} className="absolute top-1 right-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>}<Icon className={`w-8 h-8 ${cat==="boost"?"text-amber-400":cat==="consumable"?"text-purple-400":"text-indigo-400"} mb-2`}/><div className="font-bold text-sm">{item.name}</div><div className="text-xs text-slate-400 mb-2">{item.desc}</div><button onClick={()=>buyItem(item)} disabled={!ca} className={`w-full py-1.5 rounded text-sm font-bold flex items-center justify-center gap-1 ${ca?"bg-yellow-600 hover:bg-yellow-500":"bg-slate-700 text-slate-500"}`}><Star className="w-3 h-3"/>{item.cost}g</button></div>);})}</div>
        </div>}

        {tab==="friends"&&<div className="space-y-3">
          <div className="bg-indigo-900/40 border border-indigo-500/40 rounded-xl p-4"><div className="text-sm text-slate-300 mb-1">Your code</div><div className="flex items-center gap-2"><span className="font-mono text-2xl font-bold tracking-widest">{myCode||"—"}</span>{myCode&&<button onClick={()=>{navigator.clipboard?.writeText(myCode);showFlash("Copied!");}} className="text-slate-400 hover:text-indigo-400"><Copy className="w-4 h-4"/></button>}</div></div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="text-sm font-bold mb-2">Add friend</div><div className="flex gap-2"><input value={friendSearch} onChange={e=>setFriendSearch(e.target.value.toUpperCase())} maxLength={6} placeholder="Friend code" className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono uppercase tracking-widest"/><button onClick={sendFR} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm">Send</button></div></div>
          {incomingReqs.length>0&&<div className="bg-slate-800/60 border border-amber-500/40 rounded-xl p-4"><div className="font-bold mb-2 text-sm">Incoming</div>{incomingReqs.map(r=><div key={r.fromUid} className="flex items-center gap-2 bg-slate-900/40 rounded p-2 mb-1"><Avatar name={r.fromName} size={32} onClick={()=>setViewingProfile(r.fromUid)}/><span className="flex-1 text-sm">{r.fromName}</span><button onClick={()=>acceptFR(r)} className="bg-emerald-600 p-1.5 rounded"><Check className="w-3 h-3"/></button><button onClick={()=>declineFR(r)} className="bg-slate-700 p-1.5 rounded"><X className="w-3 h-3"/></button></div>)}</div>}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="font-bold mb-2 text-sm">Friends ({friends.length})</div>{friends.length===0&&<div className="text-center text-slate-500 py-4 text-sm">Share your code!</div>}{friends.map(f=><FriendRow key={f.uid} friend={f} onView={()=>setViewingProfile(f.uid)} onRemove={()=>removeFriend(f.uid)}/>)}</div>
        </div>}

        {tab==="league"&&<div className="space-y-3">
          {!league?<><div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="font-bold mb-2">Create a league</div><div className="flex gap-2"><input value={newLeagueName} onChange={e=>setNewLeagueName(e.target.value)} placeholder="League name" className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><button onClick={createLeague} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-bold">Create</button></div></div><div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="font-bold mb-2">Join a league</div><div className="flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={5} placeholder="Code" className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono uppercase tracking-widest"/><button onClick={joinLeague} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-bold">Join</button></div></div></>
          :!leagueData?<div className="text-center text-slate-500 py-8">Loading...</div>:<>
            <div className="bg-slate-800/60 border border-indigo-500/40 rounded-xl p-4 flex justify-between items-start"><div><div className="text-lg font-bold">{leagueData.name}</div><div className="text-xs text-slate-400 mt-1"><span className="font-mono bg-slate-900 px-2 py-0.5 rounded">{leagueData.code}</span><button onClick={()=>{navigator.clipboard?.writeText(leagueData.code);showFlash("Copied!");}} className="ml-1 text-slate-400 hover:text-indigo-400"><Copy className="w-3 h-3 inline"/></button> · {Object.keys(leagueData.members).length} members</div></div><button onClick={leaveLeague} className="text-xs bg-red-900/40 border border-red-700/50 px-2 py-1 rounded"><LogOut className="w-3 h-3 inline"/> Leave</button></div>
            <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg">{[["board","Board"],["polls","Polls"],["chat","Chat"],["roster","Roster"]].map(([k,l])=><button key={k} onClick={()=>setLeagueSubTab(k)} className={`flex-1 py-2 rounded-md text-xs font-medium ${leagueSubTab===k?"bg-purple-600":"hover:bg-slate-700"}`}>{l}{k==="polls"&&(leagueData.polls||[]).length>0&&` (${leagueData.polls.length})`}</button>)}</div>
            {leagueSubTab==="board"&&<><div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="font-bold mb-2">Propose a quest</div><div className="flex gap-2"><input value={newLeagueQuest.name} onChange={e=>setNewLeagueQuest({name:e.target.value})} placeholder="e.g. Run 5k" className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><button onClick={proposeQuest} className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded text-sm">Propose</button></div></div>{(leagueData.quests||[]).map(q=>{const c=leagueData.completions?.[q.id]||{};const done=!!c[userId];const total=Object.keys(leagueData.members).length;return(<div key={q.id} className={`bg-slate-800/60 border border-slate-700 rounded-xl p-3 ${done?"opacity-60":""}`}><div className="flex items-center gap-2 mb-1"><span className={`${DIFF_COLOR[q.difficulty]} text-xs px-2 py-0.5 rounded font-bold uppercase`}>{q.difficulty}</span><span className={`flex-1 text-sm ${done?"line-through":""}`}>{q.name}</span><span className="text-yellow-400 text-xs">+{q.xp}xp</span>{!done&&<button onClick={()=>completeLQ(q.id)} className="bg-emerald-600 p-1.5 rounded"><Check className="w-3 h-3"/></button>}</div><div className="text-xs text-slate-400">{Object.keys(c).length}/{total} done{q.deadline&&` · due ${new Date(q.deadline).toLocaleDateString()}`}</div></div>);})}</>}
            {leagueSubTab==="polls"&&<>{(leagueData.polls||[]).length===0&&<div className="text-center text-slate-500 py-8 text-sm">No open polls.</div>}{(leagueData.polls||[]).map(poll=>{const mc=Object.keys(leagueData.members).length;const ap=Object.values(poll.votes||{}).filter(v=>v.approve).length;const iv=!!poll.votes?.[userId];const draft=myVote[poll.id]||{approve:true,difficulty:"medium",deadline:24};return(<div key={poll.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><div className="font-bold mb-1">{poll.name}</div><div className="text-xs text-slate-400 mb-3">{leagueData.members[poll.createdBy]?.name} · {ap}/{mc} approve</div>{!iv?<div className="border-t border-slate-700 pt-3"><div className="text-sm font-medium mb-2">Your vote</div><div className="grid grid-cols-3 gap-1 mb-2">{DIFF_ORDER.filter(d=>d!=="chore").map(d=><button key={d} onClick={()=>setMyVote(m=>({...m,[poll.id]:{...draft,difficulty:d}}))} className={`py-1 text-xs rounded capitalize ${draft.difficulty===d?"bg-indigo-600":"bg-slate-700"}`}>{d}·{XP_BY_DIFF[d]}</button>)}</div><select value={draft.deadline} onChange={e=>setMyVote(m=>({...m,[poll.id]:{...draft,deadline:+e.target.value}}))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm mb-3">{DEADLINE_OPTS.filter(d=>d.v>=0).map(d=><option key={d.v} value={d.v}>{d.l}</option>)}</select><div className="flex gap-2"><button onClick={()=>castVote(poll.id,{...draft,approve:true})} className="flex-1 bg-emerald-600 py-1.5 rounded text-sm"><ThumbsUp className="w-3 h-3 inline"/> Approve</button><button onClick={()=>castVote(poll.id,{approve:false,difficulty:"medium",deadline:0})} className="flex-1 bg-red-600/60 py-1.5 rounded text-sm"><ThumbsDown className="w-3 h-3 inline"/> Reject</button></div></div>:<div className="text-xs text-emerald-400 border-t border-slate-700 pt-3">✓ Voted</div>}</div>);})}</>}
            {leagueSubTab==="chat"&&<><div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 h-80 overflow-y-auto flex flex-col gap-2">{!(leagueData.messages||[]).length&&<div className="text-center text-slate-500 m-auto text-sm">Say hi!</div>}{(leagueData.messages||[]).map(m=>{const me=m.userId===userId;const sm=leagueData.members?.[m.userId];return(<div key={m.id} className={`flex gap-2 ${me?"flex-row-reverse":"flex-row"}`}><Avatar name={m.userName} size={32} equipped={me?equipped:sm?.equipped} championBadges={me?championBadges:sm?.championBadges} onClick={()=>setViewingProfile(m.userId)}/><div className={`flex flex-col ${me?"items-end":"items-start"} min-w-0 flex-1`}><button onClick={()=>setViewingProfile(m.userId)} className="text-[10px] text-slate-400 px-2 hover:text-indigo-400">{m.userName} · {timeAgo(m.timestamp)}</button><div className={`max-w-full px-3 py-2 rounded-lg text-sm ${me?"bg-indigo-600":"bg-slate-700"}`}>{m.photo&&<img src={m.photo} alt="" className="max-w-full rounded mb-1"/>}{m.text}</div></div></div>);})}<div ref={chatEndRef}/></div><div className="flex gap-2 mt-2"><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg(chatText);}} placeholder="Message..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/><label className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded cursor-pointer flex items-center"><ImageIcon className="w-4 h-4"/><input type="file" accept="image/*" onChange={handlePhoto} className="hidden"/></label><button onClick={()=>sendMsg(chatText)} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded"><Send className="w-4 h-4"/></button></div></>}
            {leagueSubTab==="roster"&&<div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">{Object.entries(leagueData.members).sort(([,a],[,b])=>(b.completed||0)-(a.completed||0)).map(([uid,m],i)=>{const me=uid===userId;const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;return(<button key={uid} onClick={()=>setViewingProfile(uid)} className={`w-full flex items-center gap-3 p-2 rounded text-left hover:ring-2 hover:ring-indigo-400 ${me?"bg-indigo-600/30":"bg-slate-900/40"}`}><span className="w-8 text-center font-bold">{medal}</span><Avatar name={m.name} size={32} equipped={m.equipped} championBadges={m.championBadges}/><div className="flex-1"><div className="font-medium truncate">{m.name}{me&&<span className="text-xs text-indigo-300"> (you)</span>}</div><div className="text-xs text-slate-400">Lv {m.level||1}</div></div><div className="text-right"><div className="font-bold text-yellow-400">{m.completed||0}</div><div className="text-xs text-slate-400">quests</div></div></button>);})}</div>}
          </>}
        </div>}

        {tab==="bag"&&<div className="space-y-3">{inventory.length===0&&<div className="text-center text-slate-500 py-8">Bag empty. Buy rewards!</div>}{inventory.map(item=>{const Icon=ICONS[item.icon]||Gift;const cat=item.category||"reward";const badge={boost:{t:"BOOST",c:"bg-amber-600"},consumable:{t:"ITEM",c:"bg-purple-600"},reward:{t:"REWARD",c:"bg-slate-600"}};return(<div key={item.invId} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3"><Icon className={`w-6 h-6 ${cat==="boost"?"text-amber-400":cat==="consumable"?"text-purple-400":"text-indigo-400"}`}/><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge[cat].c}`}>{badge[cat].t}</span><span className="font-bold text-sm truncate">{item.name}</span></div><div className="text-xs text-slate-400">{item.desc}</div></div><button onClick={()=>useItem(item.invId)} className={`${cat==="boost"?"bg-amber-600":"bg-emerald-600"} px-3 py-1.5 rounded text-sm font-medium`}>{cat==="reward"?"Claim":"Use"}</button></div>);})}</div>}

        {pickingItem&&<div onClick={()=>setPickingItem(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"><div onClick={e=>e.stopPropagation()} className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-sm w-full p-5"><div className="font-bold mb-3">{pickingItem.item.name} — pick a quest</div><div className="space-y-2 max-h-80 overflow-y-auto">{quests.filter(q=>!q.done&&!q.failed).map(q=><button key={q.id} onClick={()=>applyItem(q.id)} className="w-full text-left bg-slate-800 hover:bg-indigo-700 rounded p-3"><div className="font-medium text-sm">{q.name}</div><div className="text-xs text-slate-400 capitalize">{q.difficulty}</div></button>)}</div><button onClick={()=>setPickingItem(null)} className="mt-3 text-xs text-slate-400">Cancel</button></div></div>}

        {viewingProfile&&<div onClick={()=>setViewingProfile(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div onClick={e=>e.stopPropagation()} className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-sm w-full p-6 relative"><button onClick={()=>setViewingProfile(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>{profileModalData?<div className="text-center"><div className="flex justify-center mb-3"><Avatar name={profileModalData.name} size={80} equipped={profileModalData.equipped} championBadges={profileModalData.championBadges}/></div><h2 className="text-xl font-bold">{profileModalData.name}</h2>{profileModalData.className&&<div className="text-sm text-indigo-300 mb-3">Lv {profileModalData.level||1} {profileModalData.className}</div>}{profileModalData.offline?<div className="text-sm text-slate-400 mt-3">Unavailable.</div>:<div className="grid grid-cols-2 gap-2 mt-4">{[["Level",profileModalData.level||1],["Streak",profileModalData.streak||0],["Quests",profileModalData.questsDone||0],["Dailies",profileModalData.dailiesDone||0]].map(([l,v])=><div key={l} className="bg-slate-800 rounded p-3"><div className="text-2xl font-bold text-indigo-400">{v}</div><div className="text-xs text-slate-400">{l}</div></div>)}</div>}</div>:<div className="text-center text-slate-400 py-8">Loading...</div>}</div></div>}
      </div>
    </div>
  );
}

function QuestActions({onClearDone,onDeleteAll}){
  const[confirmClear,setConfirmClear]=useState(false);
  const[confirmDelete,setConfirmDelete]=useState(false);
  useEffect(()=>{if(confirmClear){const t=setTimeout(()=>setConfirmClear(false),3000);return()=>clearTimeout(t);}},[confirmClear]);
  useEffect(()=>{if(confirmDelete){const t=setTimeout(()=>setConfirmDelete(false),3000);return()=>clearTimeout(t);}},[confirmDelete]);
  return(<div className="flex gap-2 justify-end">
    {confirmClear?<button onClick={()=>{onClearDone();setConfirmClear(false);}} className="text-xs bg-red-600 text-white px-2 py-1 rounded animate-pulse">Tap again to confirm</button>
      :<button onClick={()=>setConfirmClear(true)} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/>Clear completed</button>}
    {confirmDelete?<button onClick={()=>{onDeleteAll();setConfirmDelete(false);}} className="text-xs bg-red-600 text-white px-2 py-1 rounded animate-pulse">Tap again to delete ALL</button>
      :<button onClick={()=>setConfirmDelete(true)} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/>Delete all</button>}
  </div>);
}

function FriendRow({friend,onView,onRemove}){
  const[data,setData]=useState(null);
  useEffect(()=>{(async()=>{try{const r=await window.storage.get(`profilepub:${friend.code}`,true);if(r)setData(JSON.parse(r.value));}catch(e){}})();},[friend.code]);
  return(<div className="flex items-center gap-2 bg-slate-900/40 rounded p-2 mb-1"><Avatar name={friend.name} size={40} equipped={data?.equipped} championBadges={data?.championBadges} onClick={onView}/><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{friend.name}</div><div className="text-xs text-slate-400">{data?`Lv ${data.level} · ${data.questsDone||0} quests · ${data.streak||0} 🔥`:"Loading..."}</div></div><button onClick={onRemove} className="text-slate-500 hover:text-red-400 p-1"><X className="w-4 h-4"/></button></div>);
}

function AuthScreen({onAuthed}){
  const[mode,setMode]=useState("signin");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[name,setName]=useState("");const[error,setError]=useState(null);const[busy,setBusy]=useState(false);
  const prettyError=code=>{if(code?.includes("invalid-email"))return"Invalid email.";if(code?.includes("email-already-in-use"))return"Account exists. Try signing in.";if(code?.includes("weak-password"))return"Password: 6+ chars.";
    if(code?.includes("user-not-found")||code?.includes("wrong-password")||code?.includes("invalid-credential"))return"Wrong email or password.";if(code?.includes("too-many-requests"))return"Too many attempts. Wait a minute.";
    if(code?.includes("popup-closed"))return"Sign-in cancelled.";return"Something went wrong.";};
  const signIn=async()=>{setError(null);setBusy(true);try{const{getAuth,signInWithEmailAndPassword}=await import("firebase/auth");
    const cred=await signInWithEmailAndPassword(getAuth(),email.trim(),password);onAuthed({uid:cred.user.uid,name:cred.user.displayName||email.split("@")[0],email:cred.user.email,provider:"password"});}catch(e){setError(prettyError(e.code));}setBusy(false);};
  const signUp=async()=>{setError(null);if(!name.trim()){setError("Enter a name");return;}setBusy(true);try{const{getAuth,createUserWithEmailAndPassword,updateProfile}=await import("firebase/auth");
    const cred=await createUserWithEmailAndPassword(getAuth(),email.trim(),password);await updateProfile(cred.user,{displayName:name.trim()});
    onAuthed({uid:cred.user.uid,name:name.trim(),email:cred.user.email,provider:"password"});}catch(e){setError(prettyError(e.code));}setBusy(false);};
  const googleIn=async()=>{setError(null);setBusy(true);try{const{getAuth,signInWithPopup,GoogleAuthProvider}=await import("firebase/auth");
    const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});
    const cred=await signInWithPopup(getAuth(),provider);onAuthed({uid:cred.user.uid,name:cred.user.displayName||"User",email:cred.user.email,provider:"google"});}catch(e){setError(prettyError(e.code));}setBusy(false);};
  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-sm"><div className="text-center mb-6"><div className="inline-flex items-center gap-2 mb-2"><Sword className="text-indigo-400"/><h1 className="text-2xl font-bold">Goal Quest</h1></div><p className="text-sm text-slate-400">Sign in to save your progress</p></div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg mb-4">{["signin","signup"].map(m=><button key={m} onClick={()=>{setMode(m);setError(null);}} className={`flex-1 py-2 text-sm rounded ${mode===m?"bg-indigo-600":"text-slate-400"}`}>{m==="signin"?"Sign in":"Sign up"}</button>)}</div>
          <button onClick={googleIn} disabled={busy} className="w-full py-2.5 bg-white text-slate-800 rounded flex items-center justify-center gap-2 font-medium text-sm hover:bg-slate-100 mb-3 disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google</button>
          <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-slate-700"/><span className="text-xs text-slate-500">OR</span><div className="flex-1 h-px bg-slate-700"/></div>
          {mode==="signup"&&<div className="mb-3"><label className="text-xs text-slate-400 block mb-1">Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Hero" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/></div>}
          <div className="mb-3"><label className="text-xs text-slate-400 block mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/></div>
          <div className="mb-4"><label className="text-xs text-slate-400 block mb-1">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6+ characters" onKeyDown={e=>{if(e.key==="Enter")(mode==="signin"?signIn:signUp)();}} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/></div>
          {error&&<div className="bg-red-900/40 border border-red-700/50 text-red-200 text-xs rounded p-2 mb-3">{error}</div>}
          <button onClick={mode==="signin"?signIn:signUp} disabled={busy} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded font-medium text-sm disabled:opacity-60">{busy?"...":(mode==="signin"?"Sign in":"Create account")}</button>
        </div></div>
    </div>);
}

export default function App(){
  const[authedUser,setAuthedUser]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{const{getAuth,onAuthStateChanged}=await import("firebase/auth");
    onAuthStateChanged(getAuth(),user=>{if(user)setAuthedUser({uid:user.uid,name:user.displayName||user.email?.split("@")[0]||"Hero",email:user.email,provider:user.providerData?.[0]?.providerId||"password"});
      else setAuthedUser(null);setLoading(false);});})();},[]);
  const signOut=async()=>{const{getAuth}=await import("firebase/auth");await getAuth().signOut();};
  if(loading)return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;
  if(!authedUser)return <AuthScreen onAuthed={setAuthedUser}/>;
  return <GoalQuestApp authedUser={authedUser} onSignOut={signOut}/>;
}

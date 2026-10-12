(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ChallengeCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    function createRound(type,data,rng=Math.random){
        if(!['sorting','groups','albums'].includes(type))throw Error('Unknown challenge');
        let photos,target=null;
        if(type==='sorting'){
            const sortingPeople=data.people.filter(p=>(data.sortingPeople||data.people.map(p=>p.id)).includes(p.id));
            const pool=data.photos.filter(f=>f.people.every(id=>sortingPeople.some(p=>p.id===id)));
            const solo=sortingPeople.map(p=>shuffle(pool.filter(f=>f.people.length===1&&f.people[0]===p.id),rng)[0]);
            photos=shuffle([...solo,...shuffle(pool.filter(f=>f.people.length>1),rng).slice(0,6)],rng);
        }else if(type==='groups'){
            // Only select triples with at least one shared photo in this dataset.
            const triples=[];for(let a=0;a<data.people.length;a++)for(let b=a+1;b<data.people.length;b++)for(let c=b+1;c<data.people.length;c++){
                const ids=[data.people[a].id,data.people[b].id,data.people[c].id];
                if(data.photos.some(f=>ids.every(id=>f.people.includes(id))))triples.push(ids);
            }
            target=shuffle(triples,rng)[0];if(!target)throw Error('Dataset needs a shared photo with three people');
            const matches=data.photos.filter(f=>target.every(id=>f.people.includes(id)));
            const matching=shuffle(matches,rng).slice(0,Math.min(3,matches.length));
            photos=shuffle([...matching,...shuffle(data.photos.filter(f=>!target.every(id=>f.people.includes(id))),rng).slice(0,12-matching.length)],rng);
        }else{
            target=[shuffle(data.themes,rng)[0].id,shuffle(data.albumModifiers,rng)[0].id];
            const [theme,modifier]=target;
            const matches=data.photos.filter(f=>target.every(id=>f.concepts.includes(id)));
            const themeOnly=data.photos.filter(f=>f.concepts.includes(theme)&&!f.concepts.includes(modifier));
            const modifierOnly=data.photos.filter(f=>f.concepts.includes(modifier)&&!f.concepts.includes(theme));
            const neither=data.photos.filter(f=>!f.concepts.includes(theme)&&!f.concepts.includes(modifier));
            photos=shuffle([matches,themeOnly,modifierOnly,neither].flatMap(pool=>shuffle(pool,rng).slice(0,4)),rng);
        }
        const expected=type==='sorting'?photos.flatMap(f=>f.people.map(id=>f.id+':'+id)):photos.filter(f=>type==='groups'?target.every(id=>f.people.includes(id)):target.every(id=>f.concepts.includes(id))).map(f=>f.id);
        return {type,photos,target,expected,seconds:type==='sorting'?60:40};
    }
    function grade(expected,answers){const truth=new Set(expected),selected=new Set(answers);const correct=[...selected].filter(id=>truth.has(id)).length,extra=[...selected].filter(id=>!truth.has(id)).length,missing=[...truth].filter(id=>!selected.has(id)).length;return {correct,extra,missing,total:truth.size,score:Math.round(100*correct/(truth.size+extra))};}
    function fingerprint(round){return JSON.stringify([round.type,round.target&&(Array.isArray(round.target)?[...round.target].sort():round.target),round.photos.map(p=>p.id).sort()]);}
    return {shuffle,createRound,grade,fingerprint};
});

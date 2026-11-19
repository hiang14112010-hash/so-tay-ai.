import {exercises,vocabulary} from './learning-data.mjs';

// Each row gives the learner's goal, words studied, and correct answers from day 1 to day 7.
const learners=[
  ['Nguyễn Mai Anh','maianh.demo',10,35,[5,7,6,8,7,9,8]],
  ['Trần Quốc Bảo','quocbao.demo',10,31,[4,7,6,6,8,5,9]],
  ['Lê Khánh Linh','khanhlinh.demo',10,29,[4,6,7,5,6,8,6]],
  ['Phạm Gia Huy','giahuy.demo',10,26,[6,5,0,7,6,7,6]],
  ['Võ Minh Châu','minhchau.demo',5,24,[3,5,4,6,5,6,5]],
  ['Đặng Thành Đạt','thanhdat.demo',10,21,[5,4,5,0,7,6,4]],
  ['Bùi Ngọc Hà','ngocha.demo',5,18,[4,5,0,6,5,3,4]],
  ['Hoàng Đức Anh','ducanh.demo',5,15,[5,0,4,6,0,6,3]],
  ['Đỗ Thảo Vy','thaovy.demo',5,13,[0,3,4,0,4,5,0]],
  ['Vũ Nhật Nam','nhatnam.demo',5,9,[2,0,3,0,4,0,3]]
];

export function createDemoState(day,now){
  const state={users:[],cards:[],reviews:[],awards:[],attempts:[],conversations:[]};
  learners.forEach(([name,username,goal,wordCount,answers],index)=>{
    const userId='demo-'+(index+1);
    state.users.push({
      id:userId,name,username,goal,publicRank:true,intro:true,guide:4,demo:true,
      created:now-6*86400000+index
    });
    answers.forEach((correct,dateIndex)=>{
      for(let i=0;i<correct;i++){
        const item=exercises[(index+dateIndex*2+i)%exercises.length].id;
        state.awards.push({userId,item,day:day(dateIndex-6),xp:10});
      }
    });
    for(let i=0;i<wordCount;i++){
      const wordId=vocabulary[(index*3+i)%vocabulary.length].id;
      const dueOffset=(i+index)%9-3;
      state.reviews.push({userId,wordId,level:dueOffset<=0?1:2,due:day(dueOffset)});
    }
  });
  return state;
}

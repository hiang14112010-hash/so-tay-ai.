import {exercises,vocabulary} from './learning-data.mjs?v=2';

export const testPassword='SoTay-KiemThu11';
export const testNames=[
  'Nguyễn Mai Anh','Trần Quốc Bảo','Lê Khánh Linh','Phạm Gia Huy','Võ Minh Châu',
  'Đặng Thành Đạt','Bùi Ngọc Hà','Hoàng Đức Anh','Đỗ Thảo Vy','Vũ Nhật Nam'
];

// The shared example uses a fixed week so visitors see the same progress.
const sampleWeek=[
  [35,[5,7,6,8,7,9,8]],
  [31,[4,7,6,6,8,5,9]],
  [29,[4,6,7,5,6,8,6]],
  [26,[6,5,3,7,6,7,6]],
  [24,[3,5,4,6,5,6,5]],
  [21,[5,4,5,2,7,6,4]],
  [18,[4,5,3,6,5,3,4]],
  [15,[5,1,4,6,2,6,3]],
  [13,[2,3,4,1,4,5,1]],
  [9,[2,1,3,1,4,2,3]]
];
export const sampleRanking=testNames.map((name,index)=>{
  const [words,week]=sampleWeek[index];
  const total=week.reduce((sum,correct)=>sum+correct,0);
  return {slot:index+1,name,words,week,total,xp:total*10};
}).sort((a,b)=>b.xp-a.xp);

const between=(min,max)=>min+Math.floor(Math.random()*(max-min+1));

export function addTestProgress(state,userId,index,day){
  const baseline=7-Math.floor(index/2);
  const wordCount=between(8+baseline*2,12+baseline*3);
  const startWord=between(0,vocabulary.length-1);
  for(let i=0;i<wordCount;i++){
    const wordId=vocabulary[(startWord+i)%vocabulary.length].id;
    state.reviews.push({userId,wordId,level:between(1,3),due:day(between(-4,7))});
  }

  // Always seed day one and at least one recent study day.
  for(let offset=-6;offset<=0;offset++){
    if(offset>-6&&offset<-1&&baseline<6&&Math.random()<0.24)continue;
    const correct=between(baseline-2,baseline+2);
    const startExercise=between(0,exercises.length-1);
    for(let i=0;i<correct;i++){
      const item=exercises[(startExercise+i)%exercises.length].id;
      state.awards.push({userId,item,day:day(offset),xp:10});
    }
  }
}

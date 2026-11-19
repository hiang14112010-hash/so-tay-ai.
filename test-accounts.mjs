import {exercises,vocabulary} from './learning-data.mjs';

export const testPassword='SoTay-KiemThu11';
export const testNames=[
  'Nguyễn Mai Anh','Trần Quốc Bảo','Lê Khánh Linh','Phạm Gia Huy','Võ Minh Châu',
  'Đặng Thành Đạt','Bùi Ngọc Hà','Hoàng Đức Anh','Đỗ Thảo Vy','Vũ Nhật Nam'
];

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

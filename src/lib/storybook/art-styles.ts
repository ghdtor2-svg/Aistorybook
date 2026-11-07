export const storyArtStyles = [
  {id:'watercolor',name:'수채화',prompt:'Traditional transparent watercolor on textured paper, soft pigment blooms and delicate luminous washes.'},
  {id:'gouache',name:'과슈 동화',prompt:'Hand-painted gouache picture-book art, rich opaque pigments, tactile brush marks and warm paper.'},
  {id:'lyrical-animation',name:'서정 애니메이션',prompt:'Lyrical hand-drawn fantasy animation, delicately painted natural scenery, expressive characters and warm cinematic light.'},
  {id:'hero-comics',name:'히어로 코믹스',prompt:'Child-friendly American superhero comic art, confident ink lines, vibrant colors and expressive cinematic composition, gentle nonviolent storytelling.'},
  {id:'soft-clay',name:'입체 인형',prompt:'Premium softly sculpted clay and plush storybook characters, tactile materials, expressive faces and luminous cinematic lighting.'},
  {id:'colored-pencil',name:'색연필',prompt:'Traditional colored-pencil picture-book illustration with visible layered pencil strokes, rich paper texture and gentle shading.'},
  {id:'pastel',name:'파스텔',prompt:'Soft pastel storybook painting with velvety pigment, warm diffused light and expressive tender characters.'},
  {id:'ink-wash',name:'수묵 담채',prompt:'Delicate East Asian ink-and-color painting, graceful brushwork, restrained mineral colors and airy poetic scenery.'},
  {id:'oil-painting',name:'유화',prompt:'Fine storybook oil painting, luminous color, visible painterly brushwork and soft expressive character modeling.'},
  {id:'felt',name:'양모 펠트',prompt:'Handcrafted wool-felt storybook world, softly needle-felted expressive characters, visible fibers and gently lit miniature scenery.'},
] as const;

export type StoryArtStyleId=typeof storyArtStyles[number]['id'];
export const defaultStoryArtStyle:StoryArtStyleId='soft-clay';
export function isStoryArtStyleId(value:unknown):value is StoryArtStyleId{
  return typeof value==='string'&&storyArtStyles.some(style=>style.id===value);
}

export function storyArtStyle(bookId:string,existingId?:string){
  const existing=storyArtStyles.find(style=>style.id===existingId);
  if(existing)return existing;
  let seed=2166136261;
  for(const character of bookId)seed=Math.imul(seed^character.charCodeAt(0),16777619);
  return storyArtStyles[(seed>>>0)%storyArtStyles.length];
}

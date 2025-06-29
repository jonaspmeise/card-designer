import { test, expect } from "bun:test";
import { extractTemplates } from "./utility.js";

test('Function #1 is translated correctly.', () => {
  const source = `
  {{(card) => {
      if(card.Flavortext.length == 0) {
          return '';
      } else {
          // The flavortext + explanation text might be too long.
          // In that case, we don't print flavortext and issue a warning!
          
          const maxCharacterSize = 150;
          const count = (card.Text?.length ?? 0) + (card.Explanation?.length ?? 0);
          
          if(count > maxCharacterSize) {
              return '';
          }
          
          return \`
              <p style="
                  width: 95%;
                  text-align: center;
              ">
                  <i>
                      &#8222;\${card.Flavortext.trim()}&#8220;
                  </i>
              </p>
          \`;
      }
  }}}
  `;

  expect(extractTemplates(source)).toHaveLength(1);
});

test('No Templates are extracted from a source that does not have any templates.', () => {
  const source = "whatever";

  expect(extractTemplates(source)).toHaveLength(0);
});

test('Template Test #2.', () => {
  const source = `
    <svg xmlns="http://www.w3.org/2000/svg" width="{{(job) => job.targetSize.width}}" height="{{(job) => job.targetSize.height}}" style="background-color:black">
    <!-- Preprocessing -->
    {{(card) => {
      console.warn(card)
        card.Realms = (card.Realms ?? '')
            .trim()
            .split(' ')
            .map(realm => realm.trim())
            .filter((realm) => realm.length > 0);
        card.Types = (card.Types ?? '')
            .split(' ')
            .map(type => type.trim())
            .filter((type) => type.length > 0);
        card.Costs = (card.Costs ?? '')
            .trim()
            .split(',')
            .map(cost => cost.trim())
            .filter((cost) => cost.length > 0);
            
        card.RandomValue = card.Name.split('')
            .map((character) => character.charCodeAt(0) + 3)
            .reduce((prev, current) => ((prev * current) % 100001), 2);
        
        return '';
    }}};
  `;

  const templates = extractTemplates(source);

  expect(templates).toHaveLength(3);
});

test('Template #3.', () => {
  const source = `
    {{(card, job, config) => {
      if(card.Costs.length == 0) return '';
      
      const crystalSize = Math.round(0.045 * job.targetSize.height);
      
      // To center the crystals, we need to calculate the offset on each side.
      const offset = 0.28 * job.targetSize.width + ((7 - card.Costs.length) * crystalSize * 0.5);
      //const offset = (0.2 * job.targetSize.width);
  
      return card.Costs
          .map((crystal, index) => {
              let filter = '';
              
              switch(crystal.trim().toLowerCase()) {
                  case 'd':
                      filter = 'saturate(70%) brightness(0.95) hue-rotate(-60deg)';
                      break;
                  case 'e':
                      filter = 'hue-rotate(260deg) brightness(1.1) saturate(90%)';
                      break;
                  case 'm':
                      filter = 'saturate(70%) brightness(90%) hue-rotate(100deg)';
                      break;
                  case 'n':
                      filter = 'hue-rotate(20deg) saturate(90%)';
                      break;
                  case 'v':   
                      filter = 'saturate(70%) brightness(80%) hue-rotate(172deg)';
                      break;
                  case '?':
                      filter = 'grayscale(1) brightness(130%)';
                      break;
                  default:
                      filter = 'url(#desaturate)';
                      break;
              }
              
              return \`
                  <image
                      x="\${offset + (index * crystalSize)}"
                      y="\${0.133 * job.targetSize.height}"
                      width="\${crystalSize}"
                      height="\${crystalSize}"
                      filter="url(#shadow)"
                      preserveAspectRatio="xMidYMid"
                      href="\${config.cdn.template}Crystal_gruen.png)}"
                  />
                  <image
                      x="\${offset + (index * crystalSize)}"
                      y="\${0.133 * job.targetSize.height}"
                      width="\${crystalSize}"
                      height="\${crystalSize}"
                      style="filter: \${filter};"
                      preserveAspectRatio="xMidYMid"
                      href="\${config.cdn.template}Crystal_gruen.png)}"
                  />
              \`;
          })
          .join('');
    }
    }}
  `;

  const templates = extractTemplates(source);

  expect(templates).toHaveLength(1);
});

test('Template #5.', () => {
  const source = `
   <svg xmlns="http://www.w3.org/2000/svg" width="{{(job) => job.targetSize.width}}" height="{{(job) => job.targetSize.height}}" style="background-color:black">
    <!-- Preprocessing -->
    {{(card) => {
      console.warn(card)
        card.Realms = (card.Realms ?? '')
            .trim()
            .split(' ')
            .map(realm => realm.trim())
            .filter((realm) => realm.length > 0);
        card.Types = (card.Types ?? '')
            .split(' ')
            .map(type => type.trim())
            .filter((type) => type.length > 0);
        card.Costs = (card.Costs ?? '')
            .trim()
            .split(',')
            .map(cost => cost.trim())
            .filter((cost) => cost.length > 0);
            
        card.RandomValue = card.Name.split('')
            .map((character) => character.charCodeAt(0) + 3)
            .reduce((prev, current) => ((prev * current) % 100001), 2);
        
        return '';
    }}};
 
    <defs>
    `;

    const templates = extractTemplates(source);

    expect(templates).toHaveLength(3);
});

test('A Template without any parameters can be a template, too!', () => {
  const source = "{{() => new Date().getFullYear()}}";

  const templates = extractTemplates(source);

  expect(templates).toHaveLength(1);
  expect(templates[0].parameters).toHaveLength(0);
});
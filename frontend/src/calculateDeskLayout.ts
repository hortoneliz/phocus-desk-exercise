import type { PeopleQuery } from './generated/graphql';

type Person = PeopleQuery['people'][0];

/*
 * This function orders a team of people based on their dog status.
 * All 'avoids' team members are placed at the start of the team.
 * Then 'likes' and 'has' team members are interleaved.
 * and the maximum number of 'likes' will be placed between 'has' members.
 */
const orderTeam = (likesDogs: Person[], hasDogs: Person[], avoidsDogs: Person[]): Person[] => {
  if (hasDogs.length === 0) {
    return [...avoidsDogs, ...likesDogs];
  }
  // Get the minimum number of 'likes' that can be placed between 'has' members
  const countOfLikeBetweenDogs: number = Math.floor(likesDogs.length / hasDogs.length);

  // Calculate how many 'likes' are left after placing them evenly between 'has' members
  let extraLikes: number = likesDogs.length % hasDogs.length;

  const interleavedLikesAndDogs: Person[] = hasDogs.flatMap((hasDog: Person, index: number) => {
    // For every 'has' member, insert the calculated number of 'likes'
    const likesToInsert: Person[] = likesDogs.slice(
      index * countOfLikeBetweenDogs,
      (index + 1) * countOfLikeBetweenDogs,
    );
    // If there are any extra 'likes', add one before the next 'has' member
    if (extraLikes > 0) {
      const extraLike: Person | undefined = likesDogs.pop();
      if (extraLike) likesToInsert.push(extraLike);
    }
    extraLikes -= 1;
    return [...likesToInsert, hasDog];
  });

  return [...avoidsDogs, ...interleavedLikesAndDogs];
};

/**
 * requirements teams must sit together.
 * People who don't like dogs should be placed as far away from those who have dogs as possible.
 * People who have dogs should be placed as far apart as possible.
 * Preference to be given to people who would like to avoid dogs. See Example below
 * Desks are arranged in a single line of adjacent desks.
 * Teams sit next to each other, so the team boundary must be taken into account.
 */
export const calculateDeskLayout = (people: Person[]): Person[] => {
  const furthestFromDogs: Person[] = [];
  const likesIndividuals: Person[] = [];
  const hasIndividuals: Person[] = [];

  // Group people into their teams
  const teamMap: Record<string, Person[]> = {};
  for (const person of people) {
    const teamId: string | undefined = person?.team?.id;
    if (!teamId) {
      // Separate individuals without teams
      if (person.dogStatus === 'AVOID') {
        furthestFromDogs.push(person);
      } else if (person.dogStatus === 'LIKE') {
        likesIndividuals.push(person);
      } else {
        hasIndividuals.push(person);
      }
    } else {
      if (!teamMap[teamId]) {
        teamMap[teamId] = [];
      }
      teamMap[teamId].push(person);
    }
  }

  // Group teams based on their like-to-dog ratio
  const moreLikesThanDogsTeams: Person[][] = [];
  const lessLikesThanDogsTeams: Person[][] = [];
  for (const team of Object.values(teamMap)) {
    const likesDogs: Person[] = team.filter((p) => p.dogStatus === 'LIKE');
    const hasDogs: Person[] = team.filter((p) => p.dogStatus === 'HAVE');
    const avoidsDogs: Person[] = team.filter((p) => p.dogStatus === 'AVOID');

    if (avoidsDogs.length === team.length) {
      // If all team members avoid dogs, add to furthestFromDogs
      furthestFromDogs.push(...team);
    } else if (hasDogs.length === 0) {
      // If no team members have dogs, add to furthestFromDogs
      furthestFromDogs.push(...avoidsDogs, ...likesDogs);
    } else {
      const sortedTeam: Person[] = orderTeam(likesDogs, hasDogs, avoidsDogs);
      if (likesDogs.length > hasDogs.length) {
        moreLikesThanDogsTeams.push(sortedTeam);
      } else {
        lessLikesThanDogsTeams.push(sortedTeam);
      }
    }
  }

  // Shorten the moreLikesThanDogsArray to be no longer than the lessLikesThanDogsArray
  // This allows us to interleave them without running out of one or the other
  const moreLikesThanDogsAtMatchedLength: Person[][] = moreLikesThanDogsTeams.slice(
    0,
    lessLikesThanDogsTeams.length,
  );

  /* Interleave teams with more likes those with more dogs.
     This allows us to bookend teams with more likes (who will have a like at the end)
     with teams with more dogs (who will have a dog at the start)
   */
  const interleavedLikesAndDogs: Person[] = moreLikesThanDogsAtMatchedLength.flatMap(
    (moreLikesTeam: Person[], index): Person[] => {
      if (index === 0) {
        // Insert all the 'likes' and 'has' individuals that have no team
        const sortedIndividuals: Person[] = orderTeam(
          likesIndividuals,
          hasIndividuals,
          [], // Leave empty as the avoidsIndividuals will be added to the start of the final desk layout
        );
        return [
          ...moreLikesTeam,
          ...sortedIndividuals,
          ...lessLikesThanDogsTeams[index].toReversed(),
        ];
      }
      // Reverse the lessLikesThanDogsTeams[index] to ensure the 'avoids' now are at the end
      return [...moreLikesTeam, ...lessLikesThanDogsTeams[index].toReversed()];
    },
  );

  // Any remaining teams that were not interleaved may need to have their seating order reversed
  const remainingTeams: Person[] = [
    ...moreLikesThanDogsTeams.slice(lessLikesThanDogsTeams.length), // will be empty array if slice index is greater than length
    ...lessLikesThanDogsTeams.slice(moreLikesThanDogsTeams.length),
  ].flatMap((team: Person[], index) => {
    // Reverse the team if it is an odd index and moreLikesThanDogsAtMatchedLength was even
    // Or if it is an even index and moreLikesThanDogsAtMatchedLength was odd
    if (
      (index % 2 === 0 && moreLikesThanDogsAtMatchedLength.length % 2 !== 0) ||
      (index % 2 !== 0 && moreLikesThanDogsAtMatchedLength.length % 2 === 0)
    ) {
      return team.toReversed();
    }
    return team;
  });

  return [...furthestFromDogs, ...interleavedLikesAndDogs, ...remainingTeams];
};

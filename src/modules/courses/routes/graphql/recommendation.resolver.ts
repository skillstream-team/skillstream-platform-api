import { 
  GraphQLObjectType, 
  GraphQLSchema, 
  GraphQLString, 
  GraphQLInt, 
  GraphQLFloat, 
  GraphQLList, 
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType
} from 'graphql';
import { RecommendationService } from '../../services/recommendation.service';

const recommendationService = new RecommendationService();

// User Type (reused from course resolver)
const UserType = new GraphQLObjectType({
  name: 'RecommendationUser',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    username: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Course Type for recommendations
const RecommendationCourseType = new GraphQLObjectType({
  name: 'RecommendationCourse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    price: { type: new GraphQLNonNull(GraphQLFloat) },
    instructor: { type: UserType },
  }),
});

// Recommendation Type
const RecommendationType = new GraphQLObjectType({
  name: 'Recommendation',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: new GraphQLNonNull(GraphQLInt) },
    score: { type: new GraphQLNonNull(GraphQLFloat) },
    reason: { type: new GraphQLNonNull(GraphQLString) },
    algorithm: { type: new GraphQLNonNull(GraphQLString) },
    metadata: { type: GraphQLString }, // JSON as string
    isViewed: { type: new GraphQLNonNull(GraphQLBoolean) },
    isClicked: { type: new GraphQLNonNull(GraphQLBoolean) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    course: { type: RecommendationCourseType },
  }),
});

// Recommendation Stats Type
const RecommendationStatsType = new GraphQLObjectType({
  name: 'RecommendationStats',
  fields: () => ({
    totalRecommendations: { type: new GraphQLNonNull(GraphQLInt) },
    viewedRecommendations: { type: new GraphQLNonNull(GraphQLInt) },
    clickedRecommendations: { type: new GraphQLNonNull(GraphQLInt) },
    averageScore: { type: new GraphQLNonNull(GraphQLFloat) },
    topAlgorithm: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Input Types
const RecommendationFiltersInput = new GraphQLInputObjectType({
  name: 'RecommendationFiltersInput',
  fields: {
    userId: { type: new GraphQLNonNull(GraphQLInt) },
    limit: { type: GraphQLInt },
    algorithm: { type: GraphQLString },
    minScore: { type: GraphQLFloat },
    excludeViewed: { type: GraphQLBoolean },
  },
});

const UserInteractionInput = new GraphQLInputObjectType({
  name: 'UserInteractionInput',
  fields: {
    userId: { type: new GraphQLNonNull(GraphQLInt) },
    courseId: { type: GraphQLInt },
    type: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLFloat },
    metadata: { type: GraphQLString }, // JSON as string
  },
});

// Queries
const recommendationQueries = {
  recommendations: {
    type: new GraphQLList(RecommendationType),
    args: {
      filters: { type: new GraphQLNonNull(RecommendationFiltersInput) }
    },
    resolve: async (_: any, args: any) => {
      try {
        const recommendations = await recommendationService.getUserRecommendations(args.filters);
        return recommendations.map(rec => ({
          ...rec,
          metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
          createdAt: rec.createdAt.toISOString(),
          updatedAt: rec.updatedAt.toISOString(),
        }));
      } catch (error) {
        throw new Error(`Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
  
  recommendationStats: {
    type: RecommendationStatsType,
    args: {
      userId: { type: new GraphQLNonNull(GraphQLInt) }
    },
    resolve: async (_: any, args: any) => {
      try {
        return await recommendationService.getRecommendationStats(args.userId);
      } catch (error) {
        throw new Error(`Failed to fetch recommendation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
};

// Mutations
const recommendationMutations = {
  generateRecommendations: {
    type: new GraphQLList(RecommendationType),
    args: {
      userId: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: GraphQLInt }
    },
    resolve: async (_: any, args: any) => {
      try {
        const recommendations = await recommendationService.generateRecommendations(
          args.userId, 
          args.limit || 10
        );
        return recommendations.map(rec => ({
          ...rec,
          metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
          createdAt: rec.createdAt.toISOString(),
          updatedAt: rec.updatedAt.toISOString(),
        }));
      } catch (error) {
        throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  refreshRecommendations: {
    type: new GraphQLList(RecommendationType),
    args: {
      userId: { type: new GraphQLNonNull(GraphQLInt) }
    },
    resolve: async (_: any, args: any) => {
      try {
        const recommendations = await recommendationService.refreshRecommendations(args.userId);
        return recommendations.map(rec => ({
          ...rec,
          metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
          createdAt: rec.createdAt.toISOString(),
          updatedAt: rec.updatedAt.toISOString(),
        }));
      } catch (error) {
        throw new Error(`Failed to refresh recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },

  recordInteraction: {
    type: GraphQLString,
    args: {
      interaction: { type: new GraphQLNonNull(UserInteractionInput) }
    },
    resolve: async (_: any, args: any) => {
      try {
        const interaction = {
          ...args.interaction,
          metadata: args.interaction.metadata ? JSON.parse(args.interaction.metadata) : undefined
        };
        
        await recommendationService.recordInteraction(interaction);
        return 'Interaction recorded successfully';
      } catch (error) {
        throw new Error(`Failed to record interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  },
};

export const recommendationSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RecommendationQuery',
    fields: recommendationQueries,
  }),
  mutation: new GraphQLObjectType({
    name: 'RecommendationMutation',
    fields: recommendationMutations,
  }),
});

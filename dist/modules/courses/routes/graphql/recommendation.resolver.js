"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationSchema = void 0;
const graphql_1 = require("graphql");
const recommendation_service_1 = require("../../services/recommendation.service");
const recommendationService = new recommendation_service_1.RecommendationService();
// User Type (reused from course resolver)
const UserType = new graphql_1.GraphQLObjectType({
    name: 'RecommendationUser',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        username: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Course Type for recommendations
const RecommendationCourseType = new graphql_1.GraphQLObjectType({
    name: 'RecommendationCourse',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        title: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: graphql_1.GraphQLString },
        price: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        instructor: { type: UserType },
    }),
});
// Recommendation Type
const RecommendationType = new graphql_1.GraphQLObjectType({
    name: 'Recommendation',
    fields: () => ({
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        score: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        reason: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        algorithm: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        metadata: { type: graphql_1.GraphQLString }, // JSON as string
        isViewed: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        isClicked: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        createdAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        updatedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        course: { type: RecommendationCourseType },
    }),
});
// Recommendation Stats Type
const RecommendationStatsType = new graphql_1.GraphQLObjectType({
    name: 'RecommendationStats',
    fields: () => ({
        totalRecommendations: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        viewedRecommendations: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        clickedRecommendations: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        averageScore: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat) },
        topAlgorithm: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    }),
});
// Input Types
const RecommendationFiltersInput = new graphql_1.GraphQLInputObjectType({
    name: 'RecommendationFiltersInput',
    fields: {
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        limit: { type: graphql_1.GraphQLInt },
        algorithm: { type: graphql_1.GraphQLString },
        minScore: { type: graphql_1.GraphQLFloat },
        excludeViewed: { type: graphql_1.GraphQLBoolean },
    },
});
const UserInteractionInput = new graphql_1.GraphQLInputObjectType({
    name: 'UserInteractionInput',
    fields: {
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        courseId: { type: graphql_1.GraphQLInt },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        value: { type: graphql_1.GraphQLFloat },
        metadata: { type: graphql_1.GraphQLString }, // JSON as string
    },
});
// Queries
const recommendationQueries = {
    recommendations: {
        type: new graphql_1.GraphQLList(RecommendationType),
        args: {
            filters: { type: new graphql_1.GraphQLNonNull(RecommendationFiltersInput) }
        },
        resolve: async (_, args) => {
            try {
                const recommendations = await recommendationService.getUserRecommendations(args.filters);
                return recommendations.map(rec => ({
                    ...rec,
                    metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
                    createdAt: rec.createdAt.toISOString(),
                    updatedAt: rec.updatedAt.toISOString(),
                }));
            }
            catch (error) {
                throw new Error(`Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    recommendationStats: {
        type: RecommendationStatsType,
        args: {
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) }
        },
        resolve: async (_, args) => {
            try {
                return await recommendationService.getRecommendationStats(args.userId);
            }
            catch (error) {
                throw new Error(`Failed to fetch recommendation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
};
// Mutations
const recommendationMutations = {
    generateRecommendations: {
        type: new graphql_1.GraphQLList(RecommendationType),
        args: {
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
            limit: { type: graphql_1.GraphQLInt }
        },
        resolve: async (_, args) => {
            try {
                const recommendations = await recommendationService.generateRecommendations(args.userId, args.limit || 10);
                return recommendations.map(rec => ({
                    ...rec,
                    metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
                    createdAt: rec.createdAt.toISOString(),
                    updatedAt: rec.updatedAt.toISOString(),
                }));
            }
            catch (error) {
                throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    refreshRecommendations: {
        type: new graphql_1.GraphQLList(RecommendationType),
        args: {
            userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) }
        },
        resolve: async (_, args) => {
            try {
                const recommendations = await recommendationService.refreshRecommendations(args.userId);
                return recommendations.map(rec => ({
                    ...rec,
                    metadata: rec.metadata ? JSON.stringify(rec.metadata) : null,
                    createdAt: rec.createdAt.toISOString(),
                    updatedAt: rec.updatedAt.toISOString(),
                }));
            }
            catch (error) {
                throw new Error(`Failed to refresh recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
    recordInteraction: {
        type: graphql_1.GraphQLString,
        args: {
            interaction: { type: new graphql_1.GraphQLNonNull(UserInteractionInput) }
        },
        resolve: async (_, args) => {
            try {
                const interaction = {
                    ...args.interaction,
                    metadata: args.interaction.metadata ? JSON.parse(args.interaction.metadata) : undefined
                };
                await recommendationService.recordInteraction(interaction);
                return 'Interaction recorded successfully';
            }
            catch (error) {
                throw new Error(`Failed to record interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },
};
exports.recommendationSchema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'RecommendationQuery',
        fields: recommendationQueries,
    }),
    mutation: new graphql_1.GraphQLObjectType({
        name: 'RecommendationMutation',
        fields: recommendationMutations,
    }),
});

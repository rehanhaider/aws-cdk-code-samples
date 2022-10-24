import aws_cdk as core
import aws_cdk.assertions as assertions

from api_route53.api_route53_stack import ApiRoute53Stack

# example tests. To run these tests, uncomment this file along with the example
# resource in api_route53/api_route53_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = ApiRoute53Stack(app, "api-route53")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
